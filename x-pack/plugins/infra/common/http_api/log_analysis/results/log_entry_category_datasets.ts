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

export const LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_DATASETS_PATH =
  '/api/infra/log_analysis/results/log_entry_category_datasets';

/**
 * request
 */

export const getLogEntryCategoryDatasetsRequestPayloadRT = rt.type({
  data: rt.type({
    // the id of the source configuration
    sourceId: rt.string,
    // the time range to fetch the category datasets from
    timeRange: timeRangeRT,
  }),
});

export type GetLogEntryCategoryDatasetsRequestPayload = rt.TypeOf<
  typeof getLogEntryCategoryDatasetsRequestPayloadRT
>;

/**
 * response
 */

export const getLogEntryCategoryDatasetsSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      datasets: rt.array(rt.string),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogEntryCategoryDatasetsSuccessResponsePayload = rt.TypeOf<
  typeof getLogEntryCategoryDatasetsSuccessReponsePayloadRT
>;

export const getLogEntryCategoryDatasetsResponsePayloadRT = rt.union([
  getLogEntryCategoryDatasetsSuccessReponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryCategoryDatasetsReponsePayload = rt.TypeOf<
  typeof getLogEntryCategoryDatasetsResponsePayloadRT
>;
