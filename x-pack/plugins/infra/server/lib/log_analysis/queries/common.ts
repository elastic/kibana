/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const ML_ANOMALY_INDEX_PREFIX = '.ml-anomalies-';

export const getMlResultIndex = (jobId: string) => `${ML_ANOMALY_INDEX_PREFIX}${jobId}`;

export const defaultRequestParameters = {
  allowNoIndices: true,
  ignoreUnavailable: true,
  trackScores: false,
  trackTotalHits: false,
};

export const createTimeRangeFilters = (startTime: number, endTime: number) => [
  {
    range: {
      timestamp: {
        gte: startTime,
        lte: endTime,
      },
    },
  },
];

export const createResultTypeFilters = (resultType: 'model_plot' | 'record') => [
  {
    term: {
      result_type: {
        value: resultType,
      },
    },
  },
];
