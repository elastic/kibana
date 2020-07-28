/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverEvent } from '../../../../../common/endpoint/types';
import { eventId } from '../../../../../common/endpoint/models/event';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';

interface PaginationCursor {
  timestamp: number;
  eventID: string;
}

/**
 * This class handles constructing pagination cursors that resolver can use to return additional events in subsequent
 * queries. It also constructs an aggregation query to determine the totals for other queries. This class should be used
 * with a query to build cursors for paginated results.
 */
export class PaginationBuilder {
  constructor(
    /**
     * upper limit of how many results should be returned by the parent query.
     */
    private readonly size: number,
    /**
     * timestamp that will be used in the search_after section
     */
    private readonly timestamp?: number,
    /**
     * unique ID for the last event
     */
    private readonly eventID?: string
  ) {}

  private static urlEncodeCursor(data: PaginationCursor): string {
    const value = JSON.stringify(data);
    return Buffer.from(value, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private static urlDecodeCursor(cursor: string): PaginationCursor {
    const fixedCursor = cursor.replace(/\-/g, '+').replace(/_/g, '/');
    const data = Buffer.from(fixedCursor, 'base64').toString('utf8');
    const { timestamp, eventID } = JSON.parse(data);
    // take some extra care to only grab the things we want
    // convert the timestamp string to date object
    return { timestamp, eventID };
  }

  /**
   * Construct a cursor to use in subsequent queries.
   *
   * @param results the events that were returned by the ES query
   */
  static buildCursor(results: ResolverEvent[]): string | null {
    const lastResult = results[results.length - 1];
    const cursor = {
      timestamp: lastResult['@timestamp'],
      eventID: eventId(lastResult) === undefined ? '' : String(eventId(lastResult)),
    };
    return PaginationBuilder.urlEncodeCursor(cursor);
  }

  /**
   * Constructs a cursor if the requested limit has not been met.
   *
   * @param requestLimit the request limit for a query.
   * @param results the events that were returned by the ES query
   */
  static buildCursorRequestLimit(requestLimit: number, results: ResolverEvent[]): string | null {
    if (requestLimit <= results.length && results.length > 0) {
      return PaginationBuilder.buildCursor(results);
    }
    return null;
  }

  /**
   * Creates a PaginationBuilder with an upper bound limit of results and a specific cursor to use to retrieve the next
   * set of results.
   *
   * @param limit upper bound for the number of results to return within this query
   * @param after a cursor to retrieve the next set of results
   */
  static createBuilder(limit: number, after?: string): PaginationBuilder {
    if (after) {
      try {
        const cursor = PaginationBuilder.urlDecodeCursor(after);
        if (cursor.timestamp && cursor.eventID) {
          return new PaginationBuilder(limit, cursor.timestamp, cursor.eventID);
        }
      } catch (err) {
        /* tslint:disable:no-empty */
      } // ignore invalid cursor values
    }
    return new PaginationBuilder(limit);
  }

  /**
   * Creates an object for adding the pagination fields to a query
   *
   * @param tiebreaker a unique field to use as the tiebreaker for the search_after
   * @returns an object containing the pagination information
   */
  buildQueryFields(tiebreaker: string): JsonObject {
    const fields: JsonObject = {};
    fields.sort = [{ '@timestamp': 'asc' }, { [tiebreaker]: 'asc' }];
    fields.size = this.size;
    if (this.timestamp && this.eventID) {
      fields.search_after = [this.timestamp, this.eventID] as Array<number | string>;
    }
    return fields;
  }
}
