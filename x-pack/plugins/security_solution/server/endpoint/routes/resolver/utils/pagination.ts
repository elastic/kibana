/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverEvent } from '../../../../../common/endpoint/types';
import { eventId } from '../../../../../common/endpoint/models/event';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';
import { ChildrenPaginationCursor } from './children_pagination';

type SearchAfterFields = [number, string];

interface PaginationCursor {
  timestamp: number;
  eventID: string;
}

/**
 * The sort direction for the timestamp field
 */
export type TimeSortDirection = 'asc' | 'desc';

/**
 * Defines the sorting fields for queries that leverage pagination
 */
export type SortFields = [
  {
    '@timestamp': string;
  },
  { [x: string]: string }
];

/**
 * Defines a type of a function used to convert the parsed json data into a typescript type.
 * If the function fails to transform the data it should return undefined.
 */
export type Decoder<T> = (parsed: T | undefined) => T | undefined;

/**
 * Interface for defining the returned pagination information.
 */
export interface PaginationFields {
  sort: SortFields;
  size: number;
  searchAfter?: SearchAfterFields;
}

/**
 * A function to encode a cursor from a pagination object.
 *
 * @param data Transforms a pagination cursor into a base64 encoded string
 */
export function urlEncodeCursor(data: PaginationCursor | ChildrenPaginationCursor): string {
  const value = JSON.stringify(data);
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * A function to decode a cursor.
 *
 * @param cursor a cursor encoded by the `urlEncodeCursor` function
 * @param decode a function to transform the parsed data into an actual type
 */
export function urlDecodeCursor<T>(cursor: string, decode: Decoder<T>): T | undefined {
  const fixedCursor = cursor.replace(/\-/g, '+').replace(/_/g, '/');
  const data = Buffer.from(fixedCursor, 'base64').toString('utf8');
  let parsed: T;
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    return;
  }

  return decode(parsed);
}

/**
 * This class handles constructing pagination cursors that resolver can use to return additional events in subsequent
 * queries.
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

  /**
   * Validates that the parsed object is actually a PaginationCursor.
   *
   * @param parsed an object parsed from an encoded cursor.
   */
  static decode(parsed: PaginationCursor | undefined): PaginationCursor | undefined {
    if (parsed && parsed.timestamp && parsed.eventID) {
      const { timestamp, eventID } = parsed;
      return { timestamp, eventID };
    }
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
    return urlEncodeCursor(cursor);
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
        const cursor = urlDecodeCursor(after, PaginationBuilder.decode);
        if (cursor && cursor.timestamp && cursor.eventID) {
          return new PaginationBuilder(limit, cursor.timestamp, cursor.eventID);
        }
      } catch (err) {
        /* tslint:disable:no-empty */
      } // ignore invalid cursor values
    }
    return new PaginationBuilder(limit);
  }

  /**
   * Helper for creates an object for adding the pagination fields to a query
   *
   * @param tiebreaker a unique field to use as the tiebreaker for the search_after
   * @param timeSort is the timestamp sort direction
   * @returns an object containing the pagination information
   */
  buildQueryFieldsAsInterface(
    tiebreaker: string,
    timeSort: TimeSortDirection = 'asc'
  ): PaginationFields {
    const sort: SortFields = [{ '@timestamp': timeSort }, { [tiebreaker]: 'asc' }];
    let searchAfter: SearchAfterFields | undefined;
    if (this.timestamp && this.eventID) {
      searchAfter = [this.timestamp, this.eventID];
    }

    return { sort, size: this.size, searchAfter };
  }

  /**
   * Creates an object for adding the pagination fields to a query
   *
   * @param tiebreaker a unique field to use as the tiebreaker for the search_after
   * @param timeSort is the timestamp sort direction
   * @returns an object containing the pagination information
   */
  buildQueryFields(tiebreaker: string, timeSort: TimeSortDirection = 'asc'): JsonObject {
    const fields: JsonObject = {};
    const pagination = this.buildQueryFieldsAsInterface(tiebreaker, timeSort);
    fields.sort = pagination.sort;
    fields.size = pagination.size;
    if (pagination.searchAfter) {
      fields.search_after = pagination.searchAfter;
    }
    return fields;
  }
}
