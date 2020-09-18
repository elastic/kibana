/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const defaultRequestParameters = {
  allowNoIndices: true,
  ignoreUnavailable: true,
  trackScores: false,
  trackTotalHits: false,
};

export const createJobIdFilters = (jobId: string) => [
  {
    term: {
      job_id: {
        value: jobId,
      },
    },
  },
];

export const createJobIdsFilters = (jobIds: string[]) => [
  {
    terms: {
      job_id: jobIds,
    },
  },
];

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

export const createResultTypeFilters = (resultTypes: Array<'model_plot' | 'record'>) => [
  {
    terms: {
      result_type: resultTypes,
    },
  },
];

export const createCategoryIdFilters = (categoryIds: number[]) => [
  {
    terms: {
      category_id: categoryIds,
    },
  },
];

export const createDatasetsFilters = (datasets?: string[]) =>
  datasets && datasets.length > 0
    ? [
        {
          terms: {
            partition_field_value: datasets,
          },
        },
      ]
    : [];
