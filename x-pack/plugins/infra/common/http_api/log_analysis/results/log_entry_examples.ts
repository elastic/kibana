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
  '/api/infra/log_analysis/results/log_entry_examples';

/**
 * request
 */

export const getLogEntryExamplesRequestPayloadRT = rt.type({
  data: rt.intersection([
    rt.type({
      // the dataset to fetch the log rate examples from
      dataset: rt.string,
      // the number of examples to fetch
      exampleCount: rt.number,
      // the id of the source configuration
      sourceId: rt.string,
      // the time range to fetch the log rate examples from
      timeRange: timeRangeRT,
    }),
    rt.partial({
      categoryId: rt.string,
    }),
  ]),
});

export type GetLogEntryExamplesRequestPayload = rt.TypeOf<
  typeof getLogEntryExamplesRequestPayloadRT
>;

/**
 * response
 */

const logEntryExampleRT = rt.type({
  id: rt.string,
  dataset: rt.string,
  message: rt.string,
  timestamp: rt.number,
  tiebreaker: rt.number,
});

export type LogEntryExample = rt.TypeOf<typeof logEntryExampleRT>;

export const getLogEntryExamplesSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      examples: rt.array(logEntryExampleRT),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogEntryExamplesSuccessReponsePayload = rt.TypeOf<
  typeof getLogEntryExamplesSuccessReponsePayloadRT
>;

export const getLogEntryExamplesResponsePayloadRT = rt.union([
  getLogEntryExamplesSuccessReponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryExamplesResponsePayload = rt.TypeOf<
  typeof getLogEntryExamplesResponsePayloadRT
>;
