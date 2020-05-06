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

export class ChildrenQuery extends ResolverQuery<TotalsResult> {
  private readonly totalsAggs: TotalsAggregation;
  constructor(
    private readonly pagination: PaginationParams,
    indexPattern: string,
    endpointID?: string
  ) {
    super(indexPattern, endpointID);
    this.totalsAggs = new TotalsAggregation(this.pagination);
  }

  protected legacyQuery(endpointID: string, uniquePIDs: string[]) {
    const paginator = this.totalsAggs.paginateBy('endgame.serial_event_id', 'endgame.unique_ppid');
    return paginator({
      query: {
        bool: {
          filter: [
            {
              terms: { 'endgame.unique_ppid': uniquePIDs },
            },
            {
              term: { 'agent.id': endpointID },
            },
            {
              term: { 'event.category': 'process' },
            },
            {
              term: { 'event.kind': 'event' },
            },
            {
              bool: {
                should: [
                  {
                    term: { 'event.type': 'process_start' },
                  },
                  {
                    term: { 'event.action': 'fork_event' },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }

  protected query(entityIDs: string[]) {
    const paginator = this.totalsAggs.paginateBy('event.id', 'process.parent.entity_id');
    return paginator({
      query: {
        bool: {
          filter: [
            {
              terms: { 'process.parent.entity_id': entityIDs },
            },
            {
              term: { 'event.category': 'process' },
            },
            {
              term: { 'event.kind': 'event' },
            },
            {
              term: { 'event.type': 'start' },
            },
          ],
        },
      },
    });
  }

  formatResponse(response: SearchResponse<ResolverEvent>): TotalsResult {
    return this.totalsAggs.formatResponse(response);
  }
}
