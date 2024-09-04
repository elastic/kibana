/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';

export enum CoverageType {
  none = 'none',
  empty = 'empty',
  partial = 'partial',
  full = 'full',
}

export async function getFieldCoverage({
  esClient,
  dataset,
  field,
  start,
  end,
}: {
  esClient: ObservabilityElasticsearchClient;
  dataset: string;
  field: string;
  start: number;
  end: number;
}): Promise<{
  field: string;
  terms: string[];
  coverage: { with: number; without: number; type: CoverageType };
}> {
  const [{ terms }, withFieldResponse, withoutFieldResponse] = await Promise.all([
    esClient.client.termsEnum({
      index: dataset,
      field,
      size: 50,
      index_filter: {
        bool: {
          filter: [...rangeQuery(start, end)],
        },
      },
    }),
    esClient.search('service_extraction_count_hits_with_field', {
      index: dataset,
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            {
              bool: {
                filter: {
                  exists: {
                    field,
                  },
                },
              },
            },
          ],
        },
      },
    }),
    esClient.search('service_extraction_count_hits_without_field', {
      index: dataset,
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            {
              bool: {
                must_not: {
                  exists: {
                    field,
                  },
                },
              },
            },
          ],
        },
      },
    }),
  ]);

  let type: CoverageType = CoverageType.empty;

  const countWithField = withFieldResponse.hits.total.value;
  const countWithoutField = withoutFieldResponse.hits.total.value;

  if (countWithField > 0 && countWithoutField === 0) {
    type = CoverageType.full;
  } else if (countWithField === 0 && countWithoutField > 0) {
    type = CoverageType.none;
  } else if (countWithField === 0 && countWithoutField === 0) {
    type = CoverageType.empty;
  } else {
    type = CoverageType.partial;
  }

  return {
    field,
    terms,
    coverage: {
      with: countWithField,
      without: countWithoutField,
      type,
    },
  };
}
