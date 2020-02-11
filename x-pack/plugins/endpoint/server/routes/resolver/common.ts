/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { LegacyEndpointEvent, ResolverEvent } from '../../../common/types';

export interface PaginationParams {
  size: number;
  timestamp?: Date;
  eventID?: string;
}

export function transformResults(response: SearchResponse<ResolverEvent>) {
  const total = response.aggregations?.total?.value || 0;
  if (response.hits.hits.length === 0) {
    return { total, results: [], lastDocument: null };
  }
  let lastDocument: string = '';
  const results: ResolverEvent[] = [];
  for (const hit of response.hits.hits) {
    results.push(hit._source);
    lastDocument = hit._id;
  }

  return { total, results, lastDocument };
}

function isLegacy(data: ResolverEvent): data is LegacyEndpointEvent {
  return (data as LegacyEndpointEvent).endgame !== undefined;
}

export async function getPaginationParams(
  client: IScopedClusterClient,
  limit: number,
  after?: string
): Promise<PaginationParams> {
  if (!after) {
    return { size: limit };
  }
  const searchAfterDoc = (await client.callAsCurrentUser('search', {
    body: {
      query: {
        ids: {
          values: [after],
        },
      },
    },
  })) as SearchResponse<ResolverEvent>;

  if (searchAfterDoc.hits.hits.length === 0) {
    return { size: limit };
  }
  const event = searchAfterDoc.hits.hits[0]._source;

  if (isLegacy(event)) {
    return {
      size: limit,
      timestamp: event['@timestamp'],
      eventID: String(event.endgame.serial_event_id),
    };
  }
  return { size: limit, timestamp: event['@timestamp'], eventID: event.event.id };
}
