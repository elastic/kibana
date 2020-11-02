/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { eventSequence, timestampSafeVersion } from '../../../../../common/endpoint/models/event';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';
import { urlEncodeCursor, SortFields, urlDecodeCursor } from './pagination';
import { ChildEvent } from '../queries/children';

/**
 * Pagination information for the children class.
 */
export interface ChildrenPaginationCursor {
  timestamp: number;
  sequence: number;
}

/**
 * Interface for defining the returned pagination information.
 */
export interface ChildrenPaginationFields {
  sort: SortFields;
  size: number;
  filters: JsonObject[];
}

/**
 * This class handles constructing pagination cursors that resolver can use to return additional events in subsequent
 * queries.
 */
export class ChildrenPaginationBuilder {
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
     * unique sequence number for the event
     */
    private readonly sequence?: number
  ) {}

  /**
   * This function validates that the parsed cursor is a ChildrenPaginationCursor.
   *
   * @param parsed an object parsed from an encoded cursor.
   */
  static decode(
    parsed: ChildrenPaginationCursor | undefined
  ): ChildrenPaginationCursor | undefined {
    if (parsed && parsed.timestamp && parsed.sequence) {
      const { timestamp, sequence } = parsed;
      return { timestamp, sequence };
    }
  }

  /**
   * Construct a cursor to use in subsequent queries.
   *
   * @param results the events that were returned by the ES query
   */
  static buildCursor(results: ChildEvent[]): string | null {
    const lastResult = results[results.length - 1];
    const sequence = eventSequence(lastResult);
    const cursor = {
      timestamp: timestampSafeVersion(lastResult) ?? 0,
      sequence: sequence === undefined ? 0 : sequence,
    };
    return urlEncodeCursor(cursor);
  }

  /**
   * Creates a PaginationBuilder with an upper bound limit of results and a specific cursor to use to retrieve the next
   * set of results.
   *
   * @param limit upper bound for the number of results to return within this query
   * @param after a cursor to retrieve the next set of results
   */
  static createBuilder(limit: number, after?: string): ChildrenPaginationBuilder {
    if (after) {
      try {
        const cursor = urlDecodeCursor(after, ChildrenPaginationBuilder.decode);
        if (cursor && cursor.timestamp && cursor.sequence) {
          return new ChildrenPaginationBuilder(limit, cursor.timestamp, cursor.sequence);
        }
      } catch (err) {
        /* tslint:disable:no-empty */
      } // ignore invalid cursor values
    }
    return new ChildrenPaginationBuilder(limit);
  }

  /**
   * Helper for creates an object for adding the pagination fields to a query
   *
   * @param tiebreaker a unique field to use as the tiebreaker for the search_after
   * @returns an object containing the pagination information
   */
  buildQueryFields(tiebreaker: string): ChildrenPaginationFields {
    const sort: SortFields = [{ '@timestamp': 'asc' }, { [tiebreaker]: 'asc' }];
    const filters: JsonObject[] = [];
    if (this.timestamp && this.sequence) {
      filters.push(
        {
          range: {
            '@timestamp': {
              gte: this.timestamp,
            },
          },
        },
        {
          range: {
            'event.sequence': {
              gt: this.sequence,
            },
          },
        }
      );
    }

    return { sort, size: this.size, filters };
  }
}
