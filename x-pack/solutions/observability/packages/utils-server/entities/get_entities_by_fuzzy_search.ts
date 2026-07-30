/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';

const escapeWildcardCharacters = (value: string): string => value.replace(/[\\*?]/g, '\\$&');

export async function getEntitiesByFuzzySearch({
  esClient,
  entity,
  start,
  end,
  index,
}: {
  esClient: TracedElasticsearchClient;
  entity: Record<string, string>;
  start: number;
  end: number;
  index: string | string[];
}): Promise<string[]> {
  if (Object.keys(entity).length > 1) {
    return [];
  }

  const [field, value] = Object.entries(entity)[0];

  const response = await esClient.search('get_entities_by_fuzzy_search', {
    index: castArray(index).join(','),
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: new Date(start).toISOString(),
                lte: new Date(end).toISOString(),
              },
            },
          },
          {
            bool: {
              should: [
                {
                  fuzzy: {
                    [field]: {
                      value,
                      fuzziness: 'AUTO',
                    },
                  },
                },
                {
                  wildcard: {
                    [field]: {
                      value: `*${escapeWildcardCharacters(value)}*`,
                      case_insensitive: true,
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    aggs: {
      suggestions: {
        terms: {
          field,
          size: 5,
        },
      },
    },
  });

  return response.aggregations?.suggestions.buckets.map((bucket) => String(bucket.key)) ?? [];
}
