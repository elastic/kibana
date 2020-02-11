/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { ResolverLegacyData, ResolverEvent } from '../../../common/types';

export interface PaginationParams {
  size: number;
  timestamp?: Date;
  eventID?: string;
}

export function transformResults(response: SearchResponse<ResolverEvent>) {
  const results: ResolverEvent[] = [];
  for (const hit of response.hits.hits) {
    results.push(hit._source);
  }
  return {
    total: response.aggregations?.total?.value || 0,
    results,
  };
}

function isLegacy(data: ResolverEvent): data is ResolverLegacyData {
  return (data as ResolverLegacyData).endgame !== undefined;
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
    query: {
      ids: {
        values: [after],
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
