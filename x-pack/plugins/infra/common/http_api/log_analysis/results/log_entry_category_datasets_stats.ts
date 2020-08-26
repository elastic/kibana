/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { timeRangeRT, routeTimingMetadataRT } from '../../shared';

export const LOG_ANALYSIS_GET_LATEST_LOG_ENTRY_CATEGORY_DATASETS_STATS_PATH =
  '/api/infra/log_analysis/results/latest_log_entry_category_datasets_stats';

const categorizerStatusRT = rt.keyof({
  ok: null,
  warn: null,
});

export type CategorizerStatus = rt.TypeOf<typeof categorizerStatusRT>;

/**
 * request
 */

export const getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT = rt.type({
  data: rt.type({
    // the ids of the categorization jobs
    jobIds: rt.array(rt.string),
    // the time range to fetch the category datasets stats for
    timeRange: timeRangeRT,
    // the categorizer statuses to include stats for, empty means all
    includeCategorizerStatuses: rt.array(categorizerStatusRT),
  }),
});

export type GetLatestLogEntryCategoryDatasetsStatsRequestPayload = rt.TypeOf<
  typeof getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT
>;

/**
 * response
 */

const logEntryCategoriesDatasetStatsRT = rt.type({
  categorization_status: categorizerStatusRT,
  categorized_doc_count: rt.number,
  dataset: rt.string,
  dead_category_count: rt.number,
  failed_category_count: rt.number,
  frequent_category_count: rt.number,
  job_id: rt.string,
  log_time: rt.number,
  rare_category_count: rt.number,
  total_category_count: rt.number,
});

export type LogEntryCategoriesDatasetStats = rt.TypeOf<typeof logEntryCategoriesDatasetStatsRT>;

export const getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      datasetStats: rt.array(logEntryCategoriesDatasetStatsRT),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLatestLogEntryCategoryDatasetsStatsSuccessResponsePayload = rt.TypeOf<
  typeof getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT
>;
