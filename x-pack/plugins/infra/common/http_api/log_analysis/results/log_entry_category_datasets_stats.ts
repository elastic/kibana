/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import {
  badRequestErrorRT,
  forbiddenErrorRT,
  timeRangeRT,
  routeTimingMetadataRT,
} from '../../shared';

export const LOG_ANALYSIS_GET_LATEST_LOG_ENTRY_CATEGORY_DATASETS_STATS_PATH =
  '/api/infra/log_analysis/results/latest_log_entry_category_datasets_stats';

const categorizerStatusRT = rt.keyof({
  ok: null,
  warn: null,
});

/**
 * request
 */

export const getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT = rt.type({
  data: rt.type({
    // the id of the source configuration
    sourceId: rt.string,
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
  dataset: rt.string,
  categorization_status: categorizerStatusRT,
  categorized_doc_count: rt.number,
  dead_category_count: rt.number,
  failed_category_count: rt.number,
  frequent_category_count: rt.number,
  rare_category_count: rt.number,
  timestamp: rt.number,
  total_category_count: rt.number,
});

export type LogEntryCategoriesDatasetStats = rt.TypeOf<typeof logEntryCategoriesDatasetStatsRT>;

export const getLatestLogEntryCategoryDatasetsStatsSuccessReponsePayloadRT = rt.intersection([
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
  typeof getLatestLogEntryCategoryDatasetsStatsSuccessReponsePayloadRT
>;

export const getLatestLogEntryCategoryDatasetsStatsResponsePayloadRT = rt.union([
  getLatestLogEntryCategoryDatasetsStatsSuccessReponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLatestLogEntryCategoryDatasetsStatsReponsePayload = rt.TypeOf<
  typeof getLatestLogEntryCategoryDatasetsStatsResponsePayloadRT
>;
