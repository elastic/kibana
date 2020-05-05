/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../common/types';
import { ResolverQuery } from './base';
import { TotalsAggregation, TotalsResult } from './totals_aggs';
import { PaginationParams } from '../utils/pagination';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';

export class EventsQuery extends ResolverQuery<TotalsResult> {
  private readonly totalsAggs: TotalsAggregation;
  constructor(
    indexPattern: string,
    private readonly pagination: PaginationParams,
    endpointID?: string
  ) {
    super(indexPattern, endpointID);
    this.totalsAggs = new TotalsAggregation(this.pagination);
  }

  protected legacyQuery(endpointID: string, uniquePIDs: string[], index: string): JsonObject {
    const paginator = this.totalsAggs.paginateBy('endgame.serial_event_id', 'endgame.unique_pid');
    return {
      body: paginator({
        query: {
          bool: {
            filter: [
              {
                terms: { 'endgame.unique_pid': uniquePIDs },
              },
              {
                term: { 'agent.id': endpointID },
              },
              {
                term: { 'event.kind': 'event' },
              },
              {
                bool: {
                  must_not: {
                    term: { 'event.category': 'process' },
                  },
                },
              },
            ],
          },
        },
      }),
      index,
    };
  }

  protected query(entityIDs: string[], index: string): JsonObject {
    const paginator = this.totalsAggs.paginateBy('event.id', 'process.entity_id');
    return {
      body: paginator({
        query: {
          bool: {
            filter: [
              {
                terms: { 'process.entity_id': entityIDs },
              },
              {
                term: { 'event.kind': 'event' },
              },
              {
                bool: {
                  must_not: {
                    term: { 'event.category': 'process' },
                  },
                },
              },
            ],
          },
        },
      }),
      index,
    };
  }

  formatResults(response: SearchResponse<ResolverEvent>): TotalsResult {
    return this.totalsAggs.formatResults(response);
  }
}
