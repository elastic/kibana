/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { sortRT } from './log_analysis_results';

export const anomalyTypeRT = rt.keyof({
  logRate: null,
  logCategory: null,
});

export type AnomalyType = rt.TypeOf<typeof anomalyTypeRT>;

export const logEntryAnomalyCommonFieldsRT = rt.type({
  id: rt.string,
  anomalyScore: rt.number,
  dataset: rt.string,
  typical: rt.number,
  actual: rt.number,
  type: anomalyTypeRT,
  duration: rt.number,
  startTime: rt.number,
  jobId: rt.string,
});
export const logEntrylogRateAnomalyRT = logEntryAnomalyCommonFieldsRT;
export type RateAnomaly = rt.TypeOf<typeof logEntrylogRateAnomalyRT>;

export const logEntrylogCategoryAnomalyRT = rt.intersection([
  logEntryAnomalyCommonFieldsRT,
  rt.type({
    categoryId: rt.string,
    categoryRegex: rt.string,
    categoryTerms: rt.string,
  }),
]);
export type CategoryAnomaly = rt.TypeOf<typeof logEntrylogCategoryAnomalyRT>;

export const logEntryAnomalyRT = rt.union([logEntrylogRateAnomalyRT, logEntrylogCategoryAnomalyRT]);

export type LogEntryAnomaly = rt.TypeOf<typeof logEntryAnomalyRT>;

export const logEntryAnomalyDatasetsRT = rt.array(rt.string);
export type LogEntryAnomalyDatasets = rt.TypeOf<typeof logEntryAnomalyDatasetsRT>;

export const isCategoryAnomaly = (anomaly: LogEntryAnomaly): anomaly is CategoryAnomaly => {
  return anomaly.type === 'logCategory';
};

const sortOptionsRT = rt.keyof({
  anomalyScore: null,
  dataset: null,
  startTime: null,
});

export const anomaliesSortRT = sortRT(sortOptionsRT);
export type AnomaliesSort = rt.TypeOf<typeof anomaliesSortRT>;
