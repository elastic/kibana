/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../common/types';
import { extractEventID } from './normalize';

export interface PaginationParams {
  size: number;
  timestamp?: Date;
  eventID?: string;
}

export async function getPaginationParams(
  client: IScopedClusterClient,
  limit: number,
  after?: string
): Promise<PaginationParams> {
  if (!after) {
    return { size: limit };
  }
  const cursor = (await client.callAsCurrentUser('search', {
    body: {
      query: {
        ids: {
          values: [after],
        },
      },
    },
  })) as SearchResponse<ResolverEvent>;

  if (cursor.hits.hits.length === 0) {
    return { size: limit };
  }
  const event = cursor.hits.hits[0]._source;

  return {
    size: limit,
    timestamp: event['@timestamp'],
    eventID: extractEventID(event),
  };
}

export function paginate(pagination: PaginationParams, field: string, query: any) {
  const { size, timestamp, eventID } = pagination;
  query.sort = [{ '@timestamp': 'asc' }, { [field]: 'asc' }];
  query.aggs = { total: { value_count: { field } } };
  query.size = size;
  if (timestamp && eventID) {
    query.search_after = [timestamp, eventID];
  }
  return query;
}

export function paginatedResults(response: SearchResponse<ResolverEvent>) {
  const total = response.aggregations?.total?.value || 0;
  if (response.hits.hits.length === 0) {
    return { total, results: [], next: null };
  }
  let next: string;
  const results: ResolverEvent[] = [];
  for (const hit of response.hits.hits) {
    results.push(hit._source);
    next = hit._id;
  }

  return { total, results, next };
}
