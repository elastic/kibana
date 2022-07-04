/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Code that works around incompatibilities between different
// versions of Kibana / ES.
// Currently, we work with 8.1 and 8.3 and thus this code only needs
// to address the incompatibilities between those two versions.

import type {
  SearchResponse,
  SearchHitsMetadata,
  SearchHit,
  MgetResponse,
  AggregationsAggregate,
  SearchTotalHits,
  GetGetResult,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

type HitsWithTotalHits = Omit<SearchHitsMetadata<unknown>, 'total'> & {
  total: SearchTotalHits;
};

export function getHits(
  res: SearchResponse<unknown, Record<string, AggregationsAggregate>>
): HitsWithTotalHits {
  return res.hits as unknown as HitsWithTotalHits;
}

export function getAggs(
  res: SearchResponse<unknown, Record<string, AggregationsAggregate>>
): Record<string, AggregationsAggregate> | undefined {
  return res.aggregations;
}

export function getHitsItems(
  res: SearchResponse<unknown, Record<string, AggregationsAggregate>>
): Array<SearchHit<unknown>> {
  return getHits(res)?.hits ?? [];
}

export function getDocs(res: MgetResponse<any>): Array<GetGetResult<any>> {
  return res.docs as unknown as Array<GetGetResult<any>>;
}

export async function getClient(context: DataRequestHandlerContext): Promise<ElasticsearchClient> {
  return (await context.core).elasticsearch.client.asCurrentUser;
}
