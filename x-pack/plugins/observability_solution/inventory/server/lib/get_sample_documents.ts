/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { rangeQuery } from '@kbn/observability-utils/es/queries/range_query';

export function getSampleDocuments({
  esClient,
  start,
  end,
  indexPatterns,
  count,
}: {
  esClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
  indexPatterns: string[];
  count: number;
}) {
  return esClient
    .search('get_sample_documents', {
      index: indexPatterns,
      track_total_hits: true,
      size: count,
      body: {
        query: {
          bool: {
            should: [
              {
                function_score: {
                  functions: [
                    {
                      random_score: {},
                    },
                  ],
                },
              },
            ],
            must: [...rangeQuery(start, end)],
          },
        },
        sort: {
          _score: {
            order: 'desc',
          },
        },
        _source: false,
        fields: ['*' as const],
      },
    })
    .then((response) => {
      return {
        total: response.hits.total.value,
        samples: response.hits.hits.map((hit) => hit.fields ?? {}),
      };
    });
}
