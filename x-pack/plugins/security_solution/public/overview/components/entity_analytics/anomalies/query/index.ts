/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAggregatedAnomaliesQuery = ({
  from,
  to,
  jobIds,
  anomalyScoreThreshold,
}: {
  from: string;
  to: string;
  jobIds: string[];
  anomalyScoreThreshold: number;
}) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        {
          term: {
            result_type: 'record',
          },
        },
        {
          range: {
            record_score: {
              gte: anomalyScoreThreshold,
            },
          },
        },
        {
          range: {
            timestamp: {
              gte: from,
              lte: to,
            },
          },
        },
        {
          terms: {
            job_id: jobIds,
          },
        },
      ],
    },
  },
  aggs: {
    number_of_anomalies: {
      terms: {
        field: 'job_id',
      },
      aggs: {
        entity: {
          top_hits: {
            _source: {
              includes: ['host.name', 'user.name'],
            },
            size: 1,
          },
        },
      },
    },
  },
});
