/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotNullish } from '@opentelemetry/sdk-metrics-base/build/src/utils';

import { QueryDslQueryContainer, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

// TODO add safety to prevent an OOM error if the query results are too enough

export const fetchAll = async <T>(
  client: IScopedClusterClient,
  index: string,
  query: QueryDslQueryContainer
): Promise<T[]> => {
  let hits: Array<SearchHit<T>> = [];
  let accumulator: Array<SearchHit<T>> = [];

  do {
    const connectorResult = await client.asCurrentUser.search<T>({
      from: accumulator.length,
      index,
      query,
      size: 1000,
    });
    hits = connectorResult.hits.hits;
    accumulator = accumulator.concat(hits);
  } while (hits.length >= 1000);

  return accumulator
    .map(({ _source, _id }) => (_source ? { ..._source, id: _id } : undefined))
    .filter(isNotNullish);
};
