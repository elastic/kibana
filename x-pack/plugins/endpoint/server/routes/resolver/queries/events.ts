/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../common/types';
import { ResolverQuery } from './base';
import { PaginationParams } from '../utils/pagination';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { TotalsAggregation, TotalsResult } from './totals_aggs';

export class EventsQuery extends ResolverQuery<TotalsResult> {
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
      'endgame.unique_pid',
      this.pagination
    );
    return {
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
      ...totalsAggs.createFields(uniquePIDs.length),
    };
  }

  protected query(entityIDs: string[]): JsonObject {
    const totalsAggs = new TotalsAggregation('event.id', 'process.entity_id', this.pagination);
    return {
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
      ...totalsAggs.createFields(entityIDs.length),
    };
  }

  formatResponse(response: SearchResponse<ResolverEvent>): TotalsResult {
    return TotalsAggregation.formatResponse(response);
  }
}
