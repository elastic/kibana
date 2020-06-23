/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../../common/endpoint/types';
import { ResolverQuery } from './base';
import { PaginationBuilder, PaginatedResults } from '../utils/pagination';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';

/**
 * Builds a query for retrieving related events for a node.
 */
export class EventsQuery extends ResolverQuery<PaginatedResults> {
  constructor(
    private readonly pagination: PaginationBuilder,
    indexPattern: string | string[],
    endpointID?: string
  ) {
    super(indexPattern, endpointID);
  }

  protected legacyQuery(endpointID: string, uniquePIDs: string[]): JsonObject {
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
      ...this.pagination.buildQueryFields(
        uniquePIDs.length,
        'endgame.serial_event_id',
        'endgame.unique_pid'
      ),
    };
  }

  protected query(entityIDs: string[]): JsonObject {
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
      ...this.pagination.buildQueryFields(entityIDs.length, 'event.id', 'process.entity_id'),
    };
  }

  formatResponse(response: SearchResponse<ResolverEvent>): PaginatedResults {
    return {
      results: ResolverQuery.getResults(response),
      totals: PaginationBuilder.getTotals(response.aggregations),
    };
  }
}
