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

export const LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH =
  '/api/infra/log_analysis/results/log_entry_categories';

/**
 * request
 */

const logEntryCategoriesHistogramParametersRT = rt.type({
  id: rt.string,
  timeRange: timeRangeRT,
  bucketCount: rt.number,
});

export type LogEntryCategoriesHistogramParameters = rt.TypeOf<
  typeof logEntryCategoriesHistogramParametersRT
>;

export const getLogEntryCategoriesRequestPayloadRT = rt.type({
  data: rt.intersection([
    rt.type({
      // the number of categories to fetch
      categoryCount: rt.number,
      // the id of the source configuration
      sourceId: rt.string,
      // the time range to fetch the categories from
      timeRange: timeRangeRT,
      // a list of histograms to create
      histograms: rt.array(logEntryCategoriesHistogramParametersRT),
    }),
    rt.partial({
      // the datasets to filter for (optional, unfiltered if not present)
      datasets: rt.array(rt.string),
    }),
  ]),
});

export type GetLogEntryCategoriesRequestPayload = rt.TypeOf<
  typeof getLogEntryCategoriesRequestPayloadRT
>;

/**
 * response
 */

export const logEntryCategoryHistogramBucketRT = rt.type({
  startTime: rt.number,
  bucketDuration: rt.number,
  logEntryCount: rt.number,
});

export type LogEntryCategoryHistogramBucket = rt.TypeOf<typeof logEntryCategoryHistogramBucketRT>;

export const logEntryCategoryHistogramRT = rt.type({
  histogramId: rt.string,
  buckets: rt.array(logEntryCategoryHistogramBucketRT),
});

export type LogEntryCategoryHistogram = rt.TypeOf<typeof logEntryCategoryHistogramRT>;

export const logEntryCategoryRT = rt.type({
  categoryId: rt.number,
  datasets: rt.array(rt.string),
  histograms: rt.array(logEntryCategoryHistogramRT),
  logEntryCount: rt.number,
  maximumAnomalyScore: rt.number,
  regularExpression: rt.string,
});

export type LogEntryCategory = rt.TypeOf<typeof logEntryCategoryRT>;

export const getLogEntryCategoriesSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      categories: rt.array(logEntryCategoryRT),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogEntryCategoriesSuccessResponsePayload = rt.TypeOf<
  typeof getLogEntryCategoriesSuccessReponsePayloadRT
>;

export const getLogEntryCategoriesResponsePayloadRT = rt.union([
  getLogEntryCategoriesSuccessReponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryCategoriesReponsePayload = rt.TypeOf<
  typeof getLogEntryCategoriesResponsePayloadRT
>;
