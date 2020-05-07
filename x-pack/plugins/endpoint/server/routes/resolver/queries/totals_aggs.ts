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
  constructor(
    private readonly tiebreaker: string,
    private readonly aggregator: string,
    private readonly pagination: PaginationParams
  ) {}

  public createFields(numTerms: number, aggs: JsonObject = {}): JsonObject {
    const { size, timestamp, eventID } = this.pagination;
    const fields: JsonObject = {};
    fields.sort = [{ '@timestamp': 'asc' }, { [this.tiebreaker]: 'asc' }];
    fields.aggs = Object.assign({}, aggs, {
      totals: { terms: { field: this.aggregator, size: numTerms } },
    });
    fields.size = size;
    if (timestamp && eventID) {
      fields.search_after = [timestamp, eventID] as Array<number | string>;
    }
    return fields;
  }

  public static formatResponse(response: SearchResponse<ResolverEvent>): TotalsResult {
    if (response.hits.hits.length === 0) {
      return { totals: {}, results: [] };
    }

    const totals = response.aggregations?.totals?.buckets?.reduce(
      (cumulative: Record<string, number>, bucket: { key: string; doc_count: number }) => ({
        ...cumulative,
        [bucket.key]: bucket.doc_count,
      }),
      {}
    );

    const results = response.hits.hits.map(hit => hit._source);
    return { totals, results };
  }
}
