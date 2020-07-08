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

export const LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_DATASETS_PATH =
  '/api/infra/log_analysis/results/log_entry_anomalies_datasets';

/**
 * request
 */

export const getLogEntryAnomaliesDatasetsRequestPayloadRT = rt.type({
  data: rt.type({
    // the id of the source configuration
    sourceId: rt.string,
    // the time range to fetch the anomalies datasets from
    timeRange: timeRangeRT,
  }),
});

export type GetLogEntryAnomaliesDatasetsRequestPayload = rt.TypeOf<
  typeof getLogEntryAnomaliesDatasetsRequestPayloadRT
>;

/**
 * response
 */

export const getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      datasets: rt.array(rt.string),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogEntryAnomaliesDatasetsSuccessResponsePayload = rt.TypeOf<
  typeof getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT
>;

export const getLogEntryAnomaliesDatasetsResponsePayloadRT = rt.union([
  getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryAnomaliesDatasetsReponsePayload = rt.TypeOf<
  typeof getLogEntryAnomaliesDatasetsResponsePayloadRT
>;
