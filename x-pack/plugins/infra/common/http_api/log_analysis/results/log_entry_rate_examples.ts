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

export const LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH =
  '/api/infra/log_analysis/results/log_entry_rate_examples';

/**
 * request
 */

export const getLogEntryRateExamplesRequestPayloadRT = rt.type({
  data: rt.type({
    // the dataset to fetch the log rate examples from
    dataset: rt.string,
    // the number of examples to fetch
    exampleCount: rt.number,
    // the id of the source configuration
    sourceId: rt.string,
    // the time range to fetch the log rate examples from
    timeRange: timeRangeRT,
  }),
});

export type GetLogEntryRateExamplesRequestPayload = rt.TypeOf<
  typeof getLogEntryRateExamplesRequestPayloadRT
>;

/**
 * response
 */

const logEntryRateExampleRT = rt.type({
  id: rt.string,
  dataset: rt.string,
  message: rt.string,
  timestamp: rt.number,
  tiebreaker: rt.number,
});

export type LogEntryRateExample = rt.TypeOf<typeof logEntryRateExampleRT>;

export const getLogEntryRateExamplesSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      examples: rt.array(logEntryRateExampleRT),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogEntryRateExamplesSuccessReponsePayload = rt.TypeOf<
  typeof getLogEntryRateExamplesSuccessReponsePayloadRT
>;

export const getLogEntryRateExamplesResponsePayloadRT = rt.union([
  getLogEntryRateExamplesSuccessReponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryRateExamplesResponsePayload = rt.TypeOf<
  typeof getLogEntryRateExamplesResponsePayloadRT
>;
