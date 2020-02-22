/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  value = value.replace(/\-/g, '+').replace(/_/g, '/');
  const data = Buffer.from(value, 'base64').toString('utf8');
  const { timestamp, eventID } = JSON.parse(data);
  // take some extra care to only grab the things we want
  // convert the timestamp string to date object
  return { timestamp: new Date(timestamp), eventID };
}

export function getPaginationParams(limit: number, after?: string): PaginationParams {
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

export function paginate(
  pagination: PaginationParams,
  tiebreaker: string,
  aggregator: string,
  query: JsonObject
) {
  const { size, timestamp, eventID } = pagination;
  query.sort = [{ '@timestamp': 'asc' }, { [tiebreaker]: 'asc' }];
  query.aggs = query.aggs || {};
  query.aggs = Object.assign({}, query.aggs, { totals: { terms: { field: aggregator, size } } });
  query.size = size;
  if (timestamp && eventID) {
    query.search_after = [timestamp.getTime(), eventID] as Array<number | string>;
  }
  return query;
}

export function buildPaginationCursor(total: number, results: ResolverEvent[]): string | null {
  if (total > results.length && results.length > 0) {
    const lastResult = results[results.length - 1];
    const cursor = {
      timestamp: lastResult['@timestamp'],
      eventID: extractEventID(lastResult),
    };
    return urlEncodeCursor(cursor);
  }
  return null;
}

export function paginatedResults(
  response: SearchResponse<ResolverEvent>
): { totals: Record<string, number>; results: ResolverEvent[] } {
  if (response.hits.hits.length === 0) {
    return { totals: {}, results: [] };
  }

  const totals = response.aggregations?.totals?.buckets?.reduce(
    (cummulative: any, bucket: any) => ({ ...cummulative, [bucket.key]: bucket.doc_count }),
    {}
  );

  const results = response.hits.hits.map(hit => hit._source);
  return { totals, results };
}
