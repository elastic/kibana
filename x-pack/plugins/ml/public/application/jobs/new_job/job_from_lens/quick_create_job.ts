/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeWith, uniqBy, isEqual } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';

import { Filter, Query, DataViewBase } from '@kbn/es-query';

import type { LensSavedObjectAttributes, XYDataLayerConfig } from '@kbn/lens-plugin/public';

import { i18n } from '@kbn/i18n';

import type { JobCreatorType } from '../common/job_creator';
import { createEmptyJob, createEmptyDatafeed } from '../common/job_creator/util/default_configs';
import { stashJobForCloning } from '../common/job_creator/util/general';
import type { ErrorType } from '../../../../../common/util/errors';
import { createDatafeedId } from '../../../../../common/util/job_utils';
import type { MlApiServices } from '../../../services/ml_api_service';
import {
  CREATED_BY_LABEL,
  DEFAULT_BUCKET_SPAN,
  JOB_TYPE,
} from '../../../../../common/constants/new_job';
import { createQueries } from '../utils/new_job_utils';
import { isCompatibleLayer, createDetectors, getJobsItemsFromEmbeddable } from './utils';
import { VisualizationExtractor } from './visualization_extractor';

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
    private dataViewClient: DataViewsContract,
    private kibanaConfig: IUiSettingsClient,
    private timeFilter: TimefilterContract,
    private mlApiServices: MlApiServices
  ) {}

  public async createAndSaveJob(
    jobId: string,
    bucketSpan: string,
    embeddable: Embeddable,
    startJob: boolean,
    runInRealTime: boolean,
    layerIndex: number
  ): Promise<CreateState> {
    const { query, filters, to, from, vis } = getJobsItemsFromEmbeddable(embeddable);
    if (query === undefined || filters === undefined) {
      throw new Error('Cannot create job, query and filters are undefined');
    }

    const { jobConfig, datafeedConfig, start, end, jobType } = await this.createJob(
      vis,
      from,
      to,
      query,
      filters,
      bucketSpan,

      layerIndex
    );
    const job = {
      ...jobConfig,
      job_id: jobId,
      custom_settings: {
        created_by:
          jobType === JOB_TYPE.SINGLE_METRIC
            ? CREATED_BY_LABEL.SINGLE_METRIC_FROM_LENS
            : CREATED_BY_LABEL.MULTI_METRIC_FROM_LENS,
      },
    };

    const datafeedId = createDatafeedId(jobId);
    const datafeed = { ...datafeedConfig, job_id: jobId, datafeed_id: datafeedId };

    const result: CreateState = {
      jobCreated: { success: false },
      datafeedCreated: { success: false },
      jobOpened: { success: false },
      datafeedStarted: { success: false },
    };

    try {
      await this.mlApiServices.addJob({ jobId: job.job_id, job });
    } catch (error) {
      result.jobCreated.error = error;
      return result;
    }
    result.jobCreated.success = true;

    try {
      await this.mlApiServices.addDatafeed({ datafeedId, datafeedConfig: datafeed });
    } catch (error) {
      result.datafeedCreated.error = error;
      return result;
    }
    result.datafeedCreated.success = true;

    if (startJob) {
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
    try {
      const { jobConfig, datafeedConfig, jobType, start, end, includeTimeRange } =
        await this.createJob(
          vis,
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
    vis: LensSavedObjectAttributes,
    startString: string,
    endString: string,
    query: Query,
    filters: Filter[],
    bucketSpan: string,
    layerIndex: number | undefined
  ) {
    const { jobConfig, datafeedConfig, jobType } = await this.createADJobFromLensSavedObject(
      vis,
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
    vis: LensSavedObjectAttributes,
    query: Query,
    filters: Filter[],
    bucketSpan: string,
    layerIndex?: number
  ) {
    const visualization = vis.state.visualization as { layers: XYDataLayerConfig[] };

    const compatibleLayers = visualization.layers.filter(isCompatibleLayer);

    const selectedLayer =
      layerIndex !== undefined ? visualization.layers[layerIndex] : compatibleLayers[0];

    const visExtractor = new VisualizationExtractor(this.dataViewClient);
    const { fields, timeField, splitField, dataView } = await visExtractor.extractFields(
      selectedLayer,
      vis
    );

    const jobConfig = createEmptyJob();
    const datafeedConfig = createEmptyDatafeed(dataView.title);

    const combinedFiltersAndQueries = this.combineQueriesAndFilters(
      { query, filters },
      { query: vis.state.query, filters: vis.state.filters },
      dataView
    );

    datafeedConfig.query = combinedFiltersAndQueries;

    jobConfig.analysis_config.detectors = createDetectors(fields, splitField);

    jobConfig.data_description.time_field = timeField.sourceField;
    jobConfig.analysis_config.bucket_span = bucketSpan;
    if (splitField) {
      jobConfig.analysis_config.influencers = [splitField.sourceField];
    }
    const isSingleMetric = splitField === null && jobConfig.analysis_config.detectors.length === 1;
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
}
