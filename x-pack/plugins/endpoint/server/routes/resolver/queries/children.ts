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

export class ChildrenQuery extends ResolverQuery<TotalsResult> {
  constructor(
    private readonly pagination: PaginationParams,
    indexPattern: string,
    endpointID?: string
  ) {
    super(indexPattern, endpointID);
  }

  protected legacyQuery(endpointID: string, uniquePIDs: string[]): JsonObject {
    const totalsAggs = new TotalsAggregation(
      'endgame.serial_event_id',
      'endgame.unique_ppid',
      this.pagination
    );
    return {
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
      ...totalsAggs.createFields(uniquePIDs.length),
    };
  }

  protected query(entityIDs: string[]): JsonObject {
    const totalsAggs = new TotalsAggregation(
      'event.id',
      'process.parent.entity_id',
      this.pagination
    );
    return {
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
      ...totalsAggs.createFields(entityIDs.length),
    };
  }

  formatResponse(response: SearchResponse<ResolverEvent>): TotalsResult {
    return TotalsAggregation.formatResponse(response);
  }
}
