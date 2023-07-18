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
import { firstValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DashboardAppLocatorParams, DashboardStart } from '@kbn/dashboard-plugin/public';
import type { Filter, Query, DataViewBase } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { MlApiServices } from '../../../services/ml_api_service';
import type { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';
import { getFiltersForDSLQuery } from '../../../../../common/util/job_utils';
import { CREATED_BY_LABEL } from '../../../../../common/constants/new_job';
import { createQueries } from '../utils/new_job_utils';
import { createDatafeedId } from '../../../../../common/util/job_utils';

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
    protected readonly dashboardService: DashboardStart,
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
    const dashboardTitle = dashboard?.getTitle();
    if (dashboardTitle === undefined || dashboardTitle === '') {
      // embeddable may have not been in a dashboard
      // and my not have been given a title as it is unsaved.
      return null;
    }

    const findDashboardsService = await this.dashboardService.findDashboardsService();
    // find the dashboard from the dashboard service as the dashboard passed in may not have the correct id
    const foundDashboard = await findDashboardsService.findByTitle(dashboardTitle);
    if (foundDashboard === undefined) {
      return null;
    }

    const params: DashboardAppLocatorParams = {
      dashboardId: foundDashboard.id,
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

    const location = await this.dashboardService.locator?.getLocation(params);
    if (location === undefined) {
      return null;
    }

    const url = `${location.app}${location.path}`;
    const urlName = i18n.translate('xpack.ml.newJob.fromLens.createJob.namedUrlDashboard', {
      defaultMessage: 'Open {dashboardTitle}',
      values: { dashboardTitle },
    });

    return { url_name: urlName, url_value: url, time_range: 'auto' };
  }

  protected async getCustomUrls(dashboard: Dashboard, datafeedConfig: estypes.MlDatafeed) {
    const customUrls = await this.createDashboardLink(dashboard, datafeedConfig);
    return dashboard !== undefined && customUrls !== null ? { custom_urls: [customUrls] } : {};
  }
}
