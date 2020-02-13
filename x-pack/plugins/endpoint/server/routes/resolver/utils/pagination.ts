/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../common/types';
import { extractEventID } from './normalize';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';

export interface PaginationParams {
  size: number;
  timestamp?: Date;
  eventID?: string;
}

interface PaginationCursor {
  timestamp: Date;
  eventID: string;
}

function urlEncodeCursor(data: PaginationCursor) {
  const value = JSON.stringify(data);
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function urlDecodeCursor(value: string): PaginationCursor {
  const data = Buffer.from(value.replace(/\-/g, '+').replace(/\_/g, '-'), 'base64').toString(
    'utf8'
  );
  const { timestamp, eventID } = JSON.parse(data);
  // take some extra care to only grab the things we want
  return { timestamp, eventID };
}

export function getPaginationParams(limit: number, after?: string): Promise<PaginationParams> {
  if (after) {
    try {
      const cursor = urlDecodeCursor(after);
      if (cursor.timestamp && cursor.eventID) {
        return {
          size: limit,
          timestamp: cursor.timestamp,
          eventID: cursor.eventID,
        };
      }
    } catch (err) {
      /* tslint:disable:no-empty */
    } // ignore invalid cursor values
  }
  return { size: limit };
}

export function paginate(pagination: PaginationParams, field: string, query: JsonObject) {
  const { size, timestamp, eventID } = pagination;
  query.sort = [{ '@timestamp': 'asc' }, { [field]: 'asc' }];
  query.aggs = { total: { value_count: { field } } };
  query.size = size;
  if (timestamp && eventID) {
    query.search_after = ([timestamp, eventID] as unknown) as JsonObject[];
  }
  return query;
}

export function paginatedResults(
  response: SearchResponse<ResolverEvent>
): { total: number; results: ResolverEvent[]; next: string | null } {
  const total = response.aggregations?.total?.value || 0;
  if (response.hits.hits.length === 0) {
    return { total, results: [], next: null };
  }
  let next: ResolverEvent;
  const results: ResolverEvent[] = [];
  for (const hit of response.hits.hits) {
    results.push(hit._source);
    next = hit._source;
  }

  const cursor = {
    timestamp: next['@timestamp'],
    eventID: extractEventID(next),
  };

  return { total, results, next: urlEncodeCursor(cursor) };
}
