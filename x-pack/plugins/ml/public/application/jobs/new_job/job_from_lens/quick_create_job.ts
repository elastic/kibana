/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { mergeWith, uniqBy, isEqual } from 'lodash';
import { firstValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  ChartInfo,
  Embeddable,
  LensPublicStart,
  LensSavedObjectAttributes,
} from '@kbn/lens-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DashboardAppLocatorParams } from '@kbn/dashboard-plugin/public';
import type { Filter, Query, DataViewBase } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';

import type { JobCreatorType } from '../common/job_creator';
import { createEmptyJob, createEmptyDatafeed } from '../common/job_creator/util/default_configs';
import { stashJobForCloning } from '../common/job_creator/util/general';
import type { ErrorType } from '../../../../../common/util/errors';
import { createDatafeedId } from '../../../../../common/util/job_utils';
import type { MlApiServices } from '../../../services/ml_api_service';
import { getFiltersForDSLQuery } from '../../../../../common/util/job_utils';
import {
  CREATED_BY_LABEL,
  DEFAULT_BUCKET_SPAN,
  JOB_TYPE,
} from '../../../../../common/constants/new_job';
import { createQueries } from '../utils/new_job_utils';
import {
  isCompatibleLayer,
  createDetectors,
  getJobsItemsFromEmbeddable,
  getChartInfoFromVisualization,
} from './utils';
import { VisualizationExtractor } from './visualization_extractor';

type Dashboard = Embeddable['parent'];

interface CreationState {
  success: boolean;
  error?: ErrorType;
}

interface CreateState {
  jobCreated: CreationState;
  datafeedCreated: CreationState;
  jobOpened: CreationState;
  datafeedStarted: CreationState;
}

export class QuickJobCreator {
  constructor(
    private readonly lens: LensPublicStart,
    private readonly kibanaConfig: IUiSettingsClient,
    private readonly timeFilter: TimefilterContract,
    private readonly share: SharePluginStart,
    private readonly mlApiServices: MlApiServices
  ) {}

  public async createAndSaveJob(
    jobId: string,
    bucketSpan: string,
    embeddable: Embeddable,
    startJob: boolean,
    runInRealTime: boolean,
    layerIndex: number
  ): Promise<CreateState> {
    const { query, filters, to, from, dashboard, chartInfo } = await getJobsItemsFromEmbeddable(
      embeddable,
      this.lens
    );
    if (query === undefined || filters === undefined) {
      throw new Error('Cannot create job, query and filters are undefined');
    }

    const { jobConfig, datafeedConfig, start, end, jobType } = await this.createJob(
      chartInfo,
      from,
      to,
      query,
      filters,
      bucketSpan,
      layerIndex
    );

    const datafeedId = createDatafeedId(jobId);
    const datafeed = { ...datafeedConfig, job_id: jobId, datafeed_id: datafeedId };

    const job: estypes.MlJob = {
      ...jobConfig,
      job_id: jobId,
      custom_settings: {
        created_by:
          jobType === JOB_TYPE.SINGLE_METRIC
            ? CREATED_BY_LABEL.SINGLE_METRIC_FROM_LENS
            : CREATED_BY_LABEL.MULTI_METRIC_FROM_LENS,
        ...(await this.getCustomUrls(dashboard, datafeed)),
      },
    };

    const result: CreateState = {
      jobCreated: { success: false },
      datafeedCreated: { success: false },
      jobOpened: { success: false },
      datafeedStarted: { success: false },
    };

    // calculate model memory limit
    try {
      if (
        start !== undefined &&
        end !== undefined &&
        job.data_description.time_field !== undefined &&
        datafeedConfig.indices.length > 0
      ) {
        const { modelMemoryLimit } = await firstValueFrom(
          this.mlApiServices.calculateModelMemoryLimit$({
            datafeedConfig: datafeed,
            analysisConfig: job.analysis_config,
            indexPattern: datafeedConfig.indices[0],
            query: datafeedConfig.query,
            timeFieldName: job.data_description.time_field,
            earliestMs: start,
            latestMs: end,
          })
        );
        if (job.analysis_limits === undefined) {
          job.analysis_limits = {};
        }
        job.analysis_limits.model_memory_limit = modelMemoryLimit;
      }
    } catch (error) {
      // could not calculate mml, continue with job creation as default value will be used.
      // eslint-disable-next-line no-console
      console.error('could not calculate model memory limit', error);
    }

    // put job
    try {
      await this.mlApiServices.addJob({ jobId: job.job_id, job });
    } catch (error) {
      result.jobCreated.error = error;
      return result;
    }
    result.jobCreated.success = true;

    // put datafeed
    try {
      await this.mlApiServices.addDatafeed({ datafeedId, datafeedConfig: datafeed });
    } catch (error) {
      result.datafeedCreated.error = error;
      return result;
    }
    result.datafeedCreated.success = true;

    if (startJob) {
      // open job, ignore error if already open
      try {
        await this.mlApiServices.openJob({ jobId });
      } catch (error) {
        // job may already be open, so ignore 409 error.
        if (error.body.statusCode !== 409) {
          result.jobOpened.error = error;
          return result;
        }
      }
      result.jobOpened.success = true;

      // start datafeed
      try {
        await this.mlApiServices.startDatafeed({
          datafeedId,
          start,
          ...(runInRealTime ? {} : { end }),
        });
      } catch (error) {
        result.datafeedStarted.error = error;
        return result;
      }
      result.datafeedStarted.success = true;
    }

    return result;
  }
  public async createAndStashADJob(
    vis: LensSavedObjectAttributes,
    startString: string,
    endString: string,
    query: Query,
    filters: Filter[],
    layerIndex: number | undefined
  ) {
    const chartInfo = await getChartInfoFromVisualization(this.lens, vis);
    try {
      const { jobConfig, datafeedConfig, jobType, start, end, includeTimeRange } =
        await this.createJob(
          chartInfo,
          startString,
          endString,
          query,
          filters,
          DEFAULT_BUCKET_SPAN,
          layerIndex
        );

      // add job config and start and end dates to the
      // job cloning stash, so they can be used
      // by the new job wizards
      stashJobForCloning(
        {
          jobConfig,
          datafeedConfig,
          createdBy:
            jobType === JOB_TYPE.SINGLE_METRIC
              ? CREATED_BY_LABEL.SINGLE_METRIC
              : CREATED_BY_LABEL.MULTI_METRIC,
          start,
          end,
        } as JobCreatorType,
        true,
        includeTimeRange,
        !includeTimeRange
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  async createJob(
    chartInfo: ChartInfo,
    startString: string,
    endString: string,
    query: Query,
    filters: Filter[],
    bucketSpan: string,
    layerIndex: number | undefined
  ) {
    const { jobConfig, datafeedConfig, jobType } = await this.createADJobFromLensSavedObject(
      chartInfo,
      query,
      filters,
      bucketSpan,
      layerIndex
    );

    let start: number | undefined;
    let end: number | undefined;
    let includeTimeRange = true;

    try {
      // attempt to parse the start and end dates.
      // if start and end values cannot be determined
      // instruct the job cloning code to auto-select the
      // full time range for the index.
      const { min, max } = this.timeFilter.calculateBounds({ to: endString, from: startString });
      start = min?.valueOf();
      end = max?.valueOf();

      if (start === undefined || end === undefined || isNaN(start) || isNaN(end)) {
        throw Error(
          i18n.translate('xpack.ml.newJob.fromLens.createJob.error.timeRange', {
            defaultMessage: 'Incompatible time range',
          })
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      includeTimeRange = false;
      start = undefined;
      end = undefined;
    }

    return {
      jobConfig,
      datafeedConfig,
      jobType,
      start,
      end,
      includeTimeRange,
    };
  }

  private async createADJobFromLensSavedObject(
    chartInfo: ChartInfo,
    query: Query,
    filters: Filter[],
    bucketSpan: string,
    layerIndex?: number
  ) {
    const compatibleLayers = chartInfo.layers.filter(isCompatibleLayer);

    const selectedLayer =
      layerIndex !== undefined ? chartInfo.layers[layerIndex] : compatibleLayers[0];

    const visExtractor = new VisualizationExtractor();
    const { fields, timeField, splitField, dataView } = await visExtractor.extractFields(
      selectedLayer
    );

    const jobConfig = createEmptyJob();
    const datafeedConfig = createEmptyDatafeed(dataView.getIndexPattern());

    const combinedFiltersAndQueries = this.combineQueriesAndFilters(
      { query, filters },
      { query: chartInfo.query, filters: chartInfo.filters },
      dataView
    );

    datafeedConfig.query = combinedFiltersAndQueries;

    jobConfig.analysis_config.detectors = createDetectors(fields, splitField);

    jobConfig.data_description.time_field = timeField.operation.fields?.[0];
    jobConfig.analysis_config.bucket_span = bucketSpan;
    if (splitField && splitField.operation.fields) {
      jobConfig.analysis_config.influencers = [splitField.operation.fields[0]];
    }
    const isSingleMetric = !splitField && jobConfig.analysis_config.detectors.length === 1;
    const jobType = isSingleMetric ? JOB_TYPE.SINGLE_METRIC : JOB_TYPE.MULTI_METRIC;

    if (isSingleMetric) {
      jobConfig.model_plot_config = {
        enabled: true,
        annotations_enabled: true,
      };
    }

    return {
      jobConfig,
      datafeedConfig,
      jobType,
    };
  }

  private combineQueriesAndFilters(
    dashboard: { query: Query; filters: Filter[] },
    vis: { query: Query; filters: Filter[] },
    dataView: DataViewBase
  ): estypes.QueryDslQueryContainer {
    const { combinedQuery: dashboardQueries } = createQueries(
      {
        query: dashboard.query,
        filter: dashboard.filters,
      },
      dataView,
      this.kibanaConfig
    );

    const { combinedQuery: visQueries } = createQueries(
      {
        query: vis.query,
        filter: vis.filters,
      },
      dataView,
      this.kibanaConfig
    );

    const mergedQueries = mergeWith(
      dashboardQueries,
      visQueries,
      (objValue: estypes.QueryDslQueryContainer, srcValue: estypes.QueryDslQueryContainer) => {
        if (Array.isArray(objValue)) {
          const combinedQuery = objValue.concat(srcValue);
          return uniqBy(combinedQuery, isEqual);
        }
      }
    );

    return mergedQueries;
  }

  private async createDashboardLink(dashboard: Dashboard, datafeedConfig: estypes.MlDatafeed) {
    if (dashboard === undefined) {
      // embeddable may have not been in a dashboard
      return null;
    }

    const params: DashboardAppLocatorParams = {
      dashboardId: dashboard.id,
      timeRange: {
        from: '$earliest$',
        to: '$latest$',
        mode: 'absolute',
      },
      filters: getFiltersForDSLQuery(
        datafeedConfig.query,
        undefined,
        datafeedConfig.job_id,
        FilterStateStore.GLOBAL_STATE
      ),
    };
    const dashboardLocator = this.share.url.locators.get('DASHBOARD_APP_LOCATOR');
    const encodedUrl = dashboardLocator ? await dashboardLocator.getUrl(params) : '';
    const url = decodeURIComponent(encodedUrl).replace(/^.+dashboards/, 'dashboards');

    const dashboardName = dashboard.getOutput().title;

    const urlName =
      dashboardName === undefined
        ? i18n.translate('xpack.ml.newJob.fromLens.createJob.defaultUrlDashboard', {
            defaultMessage: 'Original dashboard',
          })
        : i18n.translate('xpack.ml.newJob.fromLens.createJob.namedUrlDashboard', {
            defaultMessage: 'Open {dashboardName}',
            values: { dashboardName },
          });

    return { url_name: urlName, url_value: url, time_range: 'auto' };
  }

  private async getCustomUrls(dashboard: Dashboard, datafeedConfig: estypes.MlDatafeed) {
    return dashboard !== undefined
      ? { custom_urls: [await this.createDashboardLink(dashboard, datafeedConfig)] }
      : {};
  }
}
