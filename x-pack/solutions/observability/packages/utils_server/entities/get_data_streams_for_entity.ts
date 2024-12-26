/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniq } from 'lodash';
import { ObservabilityElasticsearchClient } from '../es/client/create_observability_es_client';
import { excludeFrozenQuery } from '../es/queries/exclude_frozen_query';
import { kqlQuery } from '../es/queries/kql_query';

export async function getDataStreamsForEntity({
  esClient,
  kuery,
  index,
}: {
  esClient: ObservabilityElasticsearchClient;
  kuery: string;
  index: string | string[];
}) {
  const response = await esClient.search('get_data_streams_for_entity', {
    track_total_hits: false,
    index,
    size: 0,
    terminate_after: 1,
    timeout: '1ms',
    aggs: {
      indices: {
        terms: {
          field: '_index',
          size: 10000,
        },
      },
    },
    query: {
      bool: {
        filter: [...excludeFrozenQuery(), ...kqlQuery(kuery)],
      },
    },
  });

  const allIndices =
    response.aggregations?.indices.buckets.map((bucket) => bucket.key as string) ?? [];

  if (!allIndices.length) {
    return {
      dataStreams: [],
    };
  }

  const resolveIndexResponse = await esClient.client.indices.resolveIndex({
    name: allIndices,
  });

  const dataStreams = uniq(
    compact(await resolveIndexResponse.indices.flatMap((idx) => idx.data_stream))
  );

  return {
    dataStreams,
  };
}
