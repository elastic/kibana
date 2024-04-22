/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const defaultRequestParameters = {
  allow_no_indices: true,
  ignore_unavailable: true,
  track_scores: false,
  track_total_hits: false,
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

export const createJobIdsQuery = (query: string) => [
  {
    wildcard: {
      job_id: `*${query}*`,
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
        format: 'epoch_millis',
      },
    },
  },
];

export const createAnomalyScoreFilter = (minScore: number) => [
  {
    range: {
      record_score: {
        gte: minScore,
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

export const createInfluencerFilter = ({
  fieldName,
  fieldValue,
}: {
  fieldName: string;
  fieldValue: string;
}) => [
  {
    nested: {
      path: 'influencers',
      query: {
        bool: {
          must: [
            {
              match: {
                'influencers.influencer_field_name': fieldName,
              },
            },
            {
              query_string: {
                fields: ['influencers.influencer_field_values'],
                query: fieldValue,
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    },
  },
];
