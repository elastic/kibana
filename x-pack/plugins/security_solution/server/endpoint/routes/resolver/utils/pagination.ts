/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverEvent } from '../../../../../common/endpoint/types';
import { eventId } from '../../../../../common/endpoint/models/event';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/public';

/**
 * Represents a single result bucket of an aggregation
 */
export interface AggBucket {
  key: string;
  doc_count: number;
}

interface TotalsAggregation {
  totals?: {
    buckets?: AggBucket[];
  };
}

interface PaginationCursor {
  timestamp: number;
  eventID: string;
}

/**
 * The result structure of a query that leverages pagination. This includes totals that can be used to determine if
 * additional nodes exist and additional queries need to be made to retrieve the nodes.
 */
export interface PaginatedResults {
  /**
   * Resulting events returned from the query.
   */
  results: ResolverEvent[];
  /**
   * Mapping of unique ID to total number of events that exist in ES. The events this references is scoped to the events
   * that the query is searching for.
   */
  totals: Record<string, number>;
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
   * Constructs a cursor to use in subsequent queries to retrieve the next set of results.
   *
   * @param total the total events that exist in ES scoped for a particular query.
   * @param results the events that were returned by the ES query
   */
  static buildCursor(total: number, results: ResolverEvent[]): string | null {
    if (total > results.length && results.length > 0) {
      const lastResult = results[results.length - 1];
      const cursor = {
        timestamp: lastResult['@timestamp'],
        eventID: eventId(lastResult),
      };
      return PaginationBuilder.urlEncodeCursor(cursor);
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
   * @param numTerms number of unique IDs that are being search for in this query
   * @param tiebreaker a unique field to use as the tiebreaker for the search_after
   * @param aggregator the field that specifies a unique ID per event (e.g. entity_id)
   * @param aggs other aggregations being used with this query
   * @returns an object containing the pagination information
   */
  buildQueryFields(
    numTerms: number,
    tiebreaker: string,
    aggregator: string,
    aggs: JsonObject = {}
  ): JsonObject {
    const fields: JsonObject = {};
    fields.sort = [{ '@timestamp': 'asc' }, { [tiebreaker]: 'asc' }];
    fields.aggs = { ...aggs, totals: { terms: { field: aggregator, size: numTerms } } };
    fields.size = this.size;
    if (this.timestamp && this.eventID) {
      fields.search_after = [this.timestamp, this.eventID] as Array<number | string>;
    }
    return fields;
  }

  /**
   * Returns the totals found for the specified query
   *
   * @param aggregations the aggregation field from the ES response
   * @returns a mapping of unique ID (e.g. entity_ids) to totals found for those IDs
   */
  static getTotals(aggregations?: TotalsAggregation): Record<string, number> {
    if (!aggregations?.totals?.buckets) {
      return {};
    }

    return aggregations?.totals?.buckets?.reduce(
      (cumulative: Record<string, number>, bucket: AggBucket) => ({
        ...cumulative,
        [bucket.key]: bucket.doc_count,
      }),
      {}
    );
  }
}
