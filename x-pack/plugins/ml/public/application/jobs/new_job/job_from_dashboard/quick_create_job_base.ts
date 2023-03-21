/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { mergeWith, uniqWith, isEqual } from 'lodash';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { firstValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DashboardAppLocatorParams } from '@kbn/dashboard-plugin/public';
import type { Filter, Query, DataViewBase } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';
import type { MlApiServices } from '../../../services/ml_api_service';
import { getFiltersForDSLQuery } from '../../../../../common/util/job_utils';
import type { ErrorType } from '../../../../../common/util/errors';
import { CREATED_BY_LABEL } from '../../../../../common/constants/new_job';
import { createQueries } from '../utils/new_job_utils';
import { createDatafeedId } from '../../../../../common/util/job_utils';
import { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';

export function isLensEmbeddable(arg: any): arg is Embeddable {
  return arg.hasOwnProperty('type') && arg.type === 'lens';
}

export function isMapEmbeddable(arg: any): arg is MapEmbeddable {
  return arg.hasOwnProperty('type') && arg.type === 'map';
}

export type Dashboard = Embeddable['parent'];

interface CreationState {
  success: boolean;
  error?: ErrorType;
}

export interface CreateState {
  jobCreated: CreationState;
  datafeedCreated: CreationState;
  jobOpened: CreationState;
  datafeedStarted: CreationState;
}

function mergeQueriesCheck(
  objValue: estypes.QueryDslQueryContainer,
  srcValue: estypes.QueryDslQueryContainer
) {
  if (Array.isArray(objValue)) {
    const combinedQuery = objValue.concat(srcValue);
    return uniqWith(combinedQuery, isEqual);
  }
}

export class QuickJobCreatorBase {
  constructor(
    protected readonly kibanaConfig: IUiSettingsClient,
    protected readonly timeFilter: TimefilterContract,
    protected readonly share: SharePluginStart,
    protected readonly mlApiServices: MlApiServices
  ) {}

  protected async putJobAndDataFeed({
    jobId,
    datafeedConfig,
    jobConfig,
    createdByLabel,
    dashboard,
    start,
    end,
    startJob,
    runInRealTime,
  }: {
    jobId: string;
    datafeedConfig: Datafeed;
    jobConfig: Job;
    createdByLabel: CREATED_BY_LABEL;
    dashboard: Dashboard;
    start: number | undefined;
    end: number | undefined;
    startJob: boolean;
    runInRealTime: boolean;
  }) {
    const datafeedId = createDatafeedId(jobId);
    const datafeed = { ...datafeedConfig, job_id: jobId, datafeed_id: datafeedId };

    const job: estypes.MlJob = {
      ...jobConfig,
      job_id: jobId,
      custom_settings: {
        created_by: createdByLabel,
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

  protected combineQueriesAndFilters(
    dashboard: { query: Query; filters: Filter[] },
    vis: { query: Query; filters: Filter[] },
    dataView: DataViewBase,
    layerQuery?: { query: Query; filters: Filter[] }
  ): estypes.QueryDslQueryContainer {
    let mergedVisAndLayerQueries;

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

    if (layerQuery) {
      const { combinedQuery: layerQueries } = createQueries(
        {
          query: layerQuery.query,
          filter: layerQuery.filters,
        },
        dataView,
        this.kibanaConfig
      );
      // combine vis and layer queries if layer-level query exists
      mergedVisAndLayerQueries = mergeWith(visQueries, layerQueries, mergeQueriesCheck);
    }

    const mergedQueries = mergeWith(
      dashboardQueries,
      mergedVisAndLayerQueries ? mergedVisAndLayerQueries : visQueries,
      mergeQueriesCheck
    );

    return mergedQueries;
  }

  protected async createDashboardLink(dashboard: Dashboard, datafeedConfig: estypes.MlDatafeed) {
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

  protected async getCustomUrls(dashboard: Dashboard, datafeedConfig: estypes.MlDatafeed) {
    return dashboard !== undefined
      ? { custom_urls: [await this.createDashboardLink(dashboard, datafeedConfig)] }
      : {};
  }
}
