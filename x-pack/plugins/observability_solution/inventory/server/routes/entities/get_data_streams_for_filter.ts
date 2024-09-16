/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import { chunk, compact, uniqBy } from 'lodash';
import pLimit from 'p-limit';

export async function getDataStreamsForFilter({
  kql,
  indexPatterns,
  esClient,
}: {
  kql: string;
  esClient: ObservabilityElasticsearchClient;
  indexPatterns: string[];
}): Promise<Array<{ name: string }>> {
  const indicesResponse = await esClient.search('get_data_streams_for_entities', {
    index: indexPatterns,
    timeout: '1ms',
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [...excludeFrozenQuery(), ...kqlQuery(kql)],
      },
    },
    aggs: {
      indices: {
        terms: {
          field: '_index',
          size: 50000,
        },
      },
    },
  });

  const allIndicesChunks = chunk(
    indicesResponse.aggregations?.indices.buckets.map(({ key }) => key as string) ?? [],
    25
  );

  const limiter = pLimit(5);

  const allDataStreams = await Promise.all(
    allIndicesChunks.map(async (allIndices) => {
      return limiter(async () => {
        const resolveIndicesResponse = await esClient.client.indices.resolveIndex({
          name: allIndices.join(','),
        });

        return compact(
          resolveIndicesResponse.indices.map(
            (index) =>
              (index.name.includes(':') ? index.name.split(':')[0] + ':' : '') + index.data_stream
          )
        ).map((dataStream) => ({ name: dataStream }));
      });
    })
  );

  return uniqBy(allDataStreams.flat(), (ds) => ds.name);
}
