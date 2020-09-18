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
import { logEntryContextRT } from '../../log_entries';

export const LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH =
  '/api/infra/log_analysis/results/log_entry_category_examples';

/**
 * request
 */

export const getLogEntryCategoryExamplesRequestPayloadRT = rt.type({
  data: rt.type({
    // the category to fetch the examples for
    categoryId: rt.number,
    // the number of examples to fetch
    exampleCount: rt.number,
    // the id of the source configuration
    sourceId: rt.string,
    // the time range to fetch the category examples from
    timeRange: timeRangeRT,
  }),
});

export type GetLogEntryCategoryExamplesRequestPayload = rt.TypeOf<
  typeof getLogEntryCategoryExamplesRequestPayloadRT
>;

/**
 * response
 */

const logEntryCategoryExampleRT = rt.type({
  id: rt.string,
  dataset: rt.string,
  message: rt.string,
  timestamp: rt.number,
  tiebreaker: rt.number,
  context: logEntryContextRT,
});

export type LogEntryCategoryExample = rt.TypeOf<typeof logEntryCategoryExampleRT>;

export const getLogEntryCategoryExamplesSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      examples: rt.array(logEntryCategoryExampleRT),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogEntryCategoryExamplesSuccessResponsePayload = rt.TypeOf<
  typeof getLogEntryCategoryExamplesSuccessReponsePayloadRT
>;

export const getLogEntryCategoryExamplesResponsePayloadRT = rt.union([
  getLogEntryCategoryExamplesSuccessReponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryCategoryExamplesReponsePayload = rt.TypeOf<
  typeof getLogEntryCategoryExamplesResponsePayloadRT
>;
