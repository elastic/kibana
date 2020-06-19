/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverEvent } from '../../../../../common/endpoint/types';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';
import { PaginationBuilder } from './pagination';

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
export class TotalsPaginationBuilder {
  constructor(private readonly builder: PaginationBuilder) {}

  /**
   * Constructs a cursor to use in subsequent queries to retrieve the next set of results.
   *
   * @param total the total events that exist in ES scoped for a particular query.
   * @param results the events that were returned by the ES query
   */
  static buildCursor(total: number, results: ResolverEvent[]): string | null {
    if (total > results.length && results.length > 0) {
      return PaginationBuilder.buildCursor(results);
    }
    return null;
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
    const fields = this.builder.buildQueryFields(tiebreaker);
    fields.aggs = { ...aggs, totals: { terms: { field: aggregator, size: numTerms } } };

    return fields;
  }

  /**
   * Creates a PaginationBuilder with an upper bound limit of results and a specific cursor to use to retrieve the next
   * set of results.
   *
   * @param limit upper bound for the number of results to return within this query
   * @param after a cursor to retrieve the next set of results
   */
  static createBuilder(limit: number, after?: string): TotalsPaginationBuilder {
    return new TotalsPaginationBuilder(PaginationBuilder.createBuilder(limit, after));
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
