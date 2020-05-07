/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { PaginationParams } from '../utils/pagination';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { ResolverEvent, AggBucket } from '../../../../common/types';
import { TotalsAggregation } from './totals_aggs';

interface CatBucket extends AggBucket {
  categories?: {
    buckets?: AggBucket[];
  };
}

export interface RelatedEvent {
  count: number;
  categories: Record<string, number>;
}

export interface CategoryTotals {
  results: ResolverEvent[];
  /**
   * A mapping of entity_ids to information about its related events. Count indicates the number of related events
   * that exist. Categories indicates the number of different related event's ECS `event.category` field. This does
   * not indicate the counts for each individual "event type" (e.g. dns, security, file) because those events can
   * have multiple `event.category`s.
   */
  totals: Record<string, RelatedEvent>;
}

export class CategoriesAggregation {
  private readonly totals: TotalsAggregation;
  constructor(
    private readonly categoryField: string,
    tiebreaker: string,
    aggregator: string,
    pagination: PaginationParams
  ) {
    this.totals = new TotalsAggregation(tiebreaker, aggregator, pagination);
  }

  public createFields(numTerms: number, aggs: JsonObject = {}): JsonObject {
    const fields: JsonObject = this.totals.createFields(numTerms, aggs);
    Object.assign((fields.aggs as JsonObject).totals, {
      // TODO need to pick a size here
      aggs: { categories: { terms: { field: this.categoryField, size: 1000 } } },
    });

    return fields;
  }

  public static formatResponse(response: SearchResponse<ResolverEvent>): CategoryTotals {
    if (response.hits.hits.length === 0) {
      return { totals: {}, results: [] };
    }

    const gatherCategories = (catBucket: CatBucket) => {
      return catBucket.categories?.buckets?.reduce(
        (cumulative: Record<string, number>, bucket: AggBucket) => {
          return { ...cumulative, [bucket.key]: bucket.doc_count };
        },
        {}
      );
    };

    const totals: Record<string, RelatedEvent> = response.aggregations?.totals?.buckets?.reduce(
      (cumulative: Record<string, RelatedEvent>, bucket: CatBucket) => ({
        ...cumulative,
        [bucket.key]: {
          count: bucket.doc_count,
          ...gatherCategories(bucket),
        },
      }),
      {}
    );

    const results = response.hits.hits.map(hit => hit._source);
    return { totals, results };
  }
}
