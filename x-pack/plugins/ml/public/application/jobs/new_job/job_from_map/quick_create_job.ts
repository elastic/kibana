/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { Filter, Query } from '@kbn/es-query';

import type { MlApiServices } from '../../../services/ml_api_service';
import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../../common/constants/new_job';
import { createEmptyJob, createEmptyDatafeed } from '../common/job_creator/util/default_configs';
import { getJobsItemsFromEmbeddable } from '../job_from_lens/utils'; // move this utils to the jobs_from_dashboard common directory or create util file for map dir
import { QuickJobCreatorBase, CreateState } from '../job_from_dashboard';

export class QuickJobCreator extends QuickJobCreatorBase {
  constructor(
    public readonly kibanaConfig: IUiSettingsClient,
    public readonly timeFilter: TimefilterContract,
    public readonly share: SharePluginStart,
    public readonly mlApiServices: MlApiServices
  ) {
    super(kibanaConfig, timeFilter, share, mlApiServices);
  }

  public async createAndSaveGeoJob(
    jobId: string,
    bucketSpan: string,
    embeddable: MapEmbeddable,
    startJob: boolean,
    runInRealTime: boolean,
    dataView: DataView,
    geoField: string,
    splitField: string | null
  ): Promise<CreateState> {
    const { query, filters, to, from, dashboard } = await getJobsItemsFromEmbeddable(embeddable);

    if (query === undefined || filters === undefined) {
      throw new Error('Cannot create job, query and filters are undefined');
    }
    const { jobConfig, datafeedConfig, start, end } = await this.createGeoJob(
      dataView,
      from,
      to,
      query,
      filters,
      bucketSpan,
      geoField,
      splitField,
      dashboard
    );

    const result = await this.putJobAndDataFeed({
      jobId,
      datafeedConfig,
      jobConfig,
      createdByLabel: CREATED_BY_LABEL.GEO,
      dashboard,
      start,
      end,
      startJob,
      runInRealTime,
    });
    return result;
  }

  async createGeoJob(
    dataView: DataView,
    startString: string,
    endString: string,
    query: Query,
    filters: Filter[],
    bucketSpan: string,
    geoField: string,
    splitField: string | null,
    dashboard: any // TODO: update type
  ) {
    const { jobConfig, datafeedConfig, jobType } = await this.createGeoJobFromMapEmbeddable(
      dataView,
      query,
      filters,
      bucketSpan,
      geoField,
      splitField,
      dashboard
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

  private async createGeoJobFromMapEmbeddable(
    dataView: DataView,
    query: Query,
    filters: Filter[],
    bucketSpan: string,
    geoField: string,
    splitField: string | null,
    dashboard: any // TODO: Update type
  ) {
    const jobConfig = createEmptyJob();
    const datafeedConfig = createEmptyDatafeed(dataView.getIndexPattern());
    // are there separate fitlers from map embeddable vs dashboard?
    const combinedFiltersAndQueries = this.combineQueriesAndFilters(
      { query, filters },
      { query: dashboard.input.query, filters: dashboard.input.filters },
      dataView
    );

    datafeedConfig.query = combinedFiltersAndQueries;
    jobConfig.analysis_config.detectors = [
      {
        function: 'lat_long',
        field_name: geoField,
        ...(splitField ? { partition_field_name: splitField } : {}),
      },
    ];
    jobConfig.data_description.time_field = dataView.timeFieldName;
    jobConfig.analysis_config.bucket_span = bucketSpan;
    if (splitField) {
      jobConfig.analysis_config.influencers = [splitField];
    }

    return {
      jobConfig,
      datafeedConfig,
      jobType: JOB_TYPE.GEO,
    };
  }
}
