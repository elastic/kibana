/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { PaginationParams } from '../utils/pagination';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { ResolverEvent } from '../../../../common/types';

export interface TotalsResult {
  results: ResolverEvent[];
  totals: Record<string, number>;
}

export class TotalsAggregation {
  constructor(private readonly pagination: PaginationParams) {}

  private addTotalsAggregation(
    tiebreaker: string,
    aggregator: string,
    query: JsonObject
  ): JsonObject {
    const { size, timestamp, eventID } = this.pagination;
    query.sort = [{ '@timestamp': 'asc' }, { [tiebreaker]: 'asc' }];
    query.aggs = query.aggs || {};
    query.aggs = Object.assign({}, query.aggs, { totals: { terms: { field: aggregator, size } } });
    query.size = size;
    if (timestamp && eventID) {
      query.search_after = [timestamp, eventID] as Array<number | string>;
    }
    return query;
  }

  public paginateBy(tiebreaker: string, aggregator: string) {
    return (query: JsonObject) => {
      return this.addTotalsAggregation(tiebreaker, aggregator, query);
    };
  }

  public formatResponse(response: SearchResponse<ResolverEvent>): TotalsResult {
    if (response.hits.hits.length === 0) {
      return { totals: {}, results: [] };
    }

    const totals = response.aggregations?.totals?.buckets?.reduce(
      (cumulative: any, bucket: any) => ({ ...cumulative, [bucket.key]: bucket.doc_count }),
      {}
    );

    const results = response.hits.hits.map(hit => hit._source);
    return { totals, results };
  }
}
