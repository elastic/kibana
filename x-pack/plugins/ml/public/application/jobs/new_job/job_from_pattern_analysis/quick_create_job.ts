/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { MLCATEGORY, ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CREATED_BY_LABEL, DEFAULT_BUCKET_SPAN } from '../../../../../common/constants/new_job';
import { CreateState, QuickJobCreatorBase } from '../job_from_dashboard/quick_create_job_base';
import { MlApiServices } from '../../../services/ml_api_service';
import { createEmptyDatafeed, createEmptyJob } from '../common/job_creator/util/default_configs';
import { stashJobForCloning } from '../common/job_creator/util/general';
import { JobCreatorType } from '../common/job_creator';

// export enum CATEGORIZATION_TYPE {
//   COUNT,
//   RARE,
// }

export const CATEGORIZATION_TYPE = {
  COUNT: ML_JOB_AGGREGATION.COUNT,
  RARE: ML_JOB_AGGREGATION.RARE,
} as const;

export type CategorizationType = typeof CATEGORIZATION_TYPE[keyof typeof CATEGORIZATION_TYPE];

export class QuickCategorizationJobCreator extends QuickJobCreatorBase {
  constructor(
    kibanaConfig: IUiSettingsClient,
    timeFilter: TimefilterContract,
    dashboardService: DashboardStart,
    private data: DataPublicPluginStart,
    mlApiServices: MlApiServices
  ) {
    super(kibanaConfig, timeFilter, dashboardService, mlApiServices);
  }

  public async createAndSaveJob(
    categorizationType: CategorizationType,
    jobId: string,
    bucketSpan: string,
    dataView: DataView,
    field: DataViewField,
    partitionField: DataViewField | null,
    query: QueryDslQueryContainer,
    timeRange: TimeRange,
    startJob: boolean,
    runInRealTime: boolean,
    layerIndex: number
  ): Promise<CreateState> {
    // const { query, filters, to, from, dashboard, chartInfo } = await getJobsItemsFromEmbeddable(
    //   embeddable,
    //   this.lens
    // );
    if (query === undefined) {
      throw new Error('Cannot create job, query and filters are undefined');
    }

    const { jobConfig, datafeedConfig, start, end } = await this.createJob(
      categorizationType,
      dataView,
      field,
      partitionField,
      timeRange,
      query,
      bucketSpan
    );
    const createdByLabel = CREATED_BY_LABEL.CATEGORIZATION_FROM_PATTERN_ANALYSIS;

    const result = await this.putJobAndDataFeed({
      jobId,
      datafeedConfig,
      jobConfig,
      createdByLabel,
      dashboard: undefined,
      start,
      end,
      startJob,
      runInRealTime,
    });
    return result;
  }

  public async createAndStashADJob(
    categorizationType: CategorizationType,
    dataViewId: string,
    fieldName: string,
    partitionFieldName: string | null,
    startString: string,
    endString: string,
    query: QueryDslQueryContainer
  ) {
    try {
      const dataView = await this.data.dataViews.get(dataViewId);
      const field = dataView.getFieldByName(fieldName);
      const partitionField = partitionFieldName
        ? dataView.getFieldByName(partitionFieldName) ?? null
        : null;

      if (field === undefined) {
        throw new Error('Cannot create job, field is undefined');
      }

      const { jobConfig, datafeedConfig, start, end, includeTimeRange } = await this.createJob(
        categorizationType,
        dataView,
        field,
        partitionField,
        { from: startString, to: endString },
        query,
        DEFAULT_BUCKET_SPAN
      );

      // add job config and start and end dates to the
      // job cloning stash, so they can be used
      // by the new job wizards
      stashJobForCloning(
        {
          jobConfig,
          datafeedConfig,
          createdBy: CREATED_BY_LABEL.CATEGORIZATION_FROM_PATTERN_ANALYSIS,
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

  private async createJob(
    categorizationType: CategorizationType,
    dataView: DataView,
    field: DataViewField,
    partitionField: DataViewField | null,
    timeRange: TimeRange,
    query: QueryDslQueryContainer,
    bucketSpan: string
  ) {
    // const { jobConfig, datafeedConfig, jobType } = await this.createADJobFromLensSavedObject(
    //   chartInfo,
    //   query,
    //   filters,
    //   bucketSpan,
    //   layerIndex
    // );

    const jobConfig = createEmptyJob();
    const datafeedConfig = createEmptyDatafeed(dataView.getIndexPattern());

    // const combinedFiltersAndQueries = this.combineQueriesAndFilters(
    //   { query, filters },
    //   { query: { query: {}, language: 'lucene' }, filters: [] },
    //   dataView
    // );

    datafeedConfig.query = query;
    jobConfig.analysis_config = {
      categorization_field_name: field.name,
      per_partition_categorization: {
        enabled: partitionField !== null,
        stop_on_warn: false,
      },
      influencers: [MLCATEGORY],
      detectors: [
        {
          function: categorizationType,
          by_field_name: MLCATEGORY,
          ...(partitionField ? { partition_field_name: partitionField.name } : {}),
        },
      ],
      bucket_span: bucketSpan,
    };
    jobConfig.data_description.time_field = dataView.timeFieldName;

    // jobConfig.analysis_config.detectors = createDetectors(fields, splitField);

    // jobConfig.data_description.time_field = timeField.operation.fields?.[0];
    // if (splitField && splitField.operation.fields) {
    //   jobConfig.analysis_config.influencers = [splitField.operation.fields[0]];
    // }
    let start: number | undefined;
    let end: number | undefined;
    let includeTimeRange = true;

    try {
      // attempt to parse the start and end dates.
      // if start and end values cannot be determined
      // instruct the job cloning code to auto-select the
      // full time range for the index.
      const { min, max } = this.timeFilter.calculateBounds(timeRange);
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
      start,
      end,
      includeTimeRange,
    };
  }
}
