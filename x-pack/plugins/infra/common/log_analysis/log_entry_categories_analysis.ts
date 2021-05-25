/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { sortRT } from './log_analysis_results';

export const logEntryCategoriesJobTypeRT = rt.keyof({
  'log-entry-categories-count': null,
});

export type LogEntryCategoriesJobType = rt.TypeOf<typeof logEntryCategoriesJobTypeRT>;

export const logEntryCategoriesJobTypes: LogEntryCategoriesJobType[] = [
  'log-entry-categories-count',
];

export const logEntryCategoryDatasetRT = rt.type({
  name: rt.string,
  maximumAnomalyScore: rt.number,
});

export type LogEntryCategoryDataset = rt.TypeOf<typeof logEntryCategoryDatasetRT>;

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
  datasets: rt.array(logEntryCategoryDatasetRT),
  histograms: rt.array(logEntryCategoryHistogramRT),
  logEntryCount: rt.number,
  maximumAnomalyScore: rt.number,
  regularExpression: rt.string,
});

export type LogEntryCategory = rt.TypeOf<typeof logEntryCategoryRT>;

const sortOptionsRT = rt.keyof({
  maximumAnomalyScore: null,
  logEntryCount: null,
});

export const categoriesSortRT = sortRT(sortOptionsRT);
export type CategoriesSort = rt.TypeOf<typeof categoriesSortRT>;
