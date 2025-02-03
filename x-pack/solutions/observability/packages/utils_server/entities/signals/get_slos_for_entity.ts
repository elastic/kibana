/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityElasticsearchClient } from '../../es/client/create_observability_es_client';
import { kqlQuery } from '../../es/queries/kql_query';

export async function getSlosForEntity({
  start,
  end,
  entity,
  esClient,
  sloSummaryIndices,
  size,
  spaceId,
}: {
  start: number;
  end: number;
  entity: Record<string, unknown>;
  esClient: ObservabilityElasticsearchClient;
  sloSummaryIndices: string | string[];
  size: number;
  spaceId: string;
}) {
  const slosKuery = Object.entries(entity)
    .map(([field, value]) => {
      return `(slo.groupings.${field}:"${value}")`;
    })
    .join(' AND ');

  const sloSummaryResponse = await esClient.search('get_slo_summaries_for_entity', {
    index: sloSummaryIndices,
    size,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...kqlQuery(slosKuery),
          {
            range: {
              'slo.createdAt': {
                lte: end,
              },
            },
          },
          {
            range: {
              summaryUpdatedAt: {
                gte: start,
              },
            },
          },
          {
            term: {
              spaceId,
            },
          },
        ],
      },
    },
  });

  return {
    ...sloSummaryResponse,
    hits: {
      ...sloSummaryResponse.hits,
      hits: sloSummaryResponse.hits.hits.map((hit) => {
        return {
          ...hit,
          _source: hit._source as Record<string, any> & {
            status: 'VIOLATED' | 'DEGRADED' | 'HEALTHY' | 'NO_DATA';
          },
        };
      }),
    },
  };
}
