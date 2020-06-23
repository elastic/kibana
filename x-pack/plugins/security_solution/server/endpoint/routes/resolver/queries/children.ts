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
 * Builds a query for retrieving descendants of a node.
 */
export class ChildrenQuery extends ResolverQuery<PaginatedResults> {
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
      ...this.pagination.buildQueryFields(
        uniquePIDs.length,
        'endgame.serial_event_id',
        'endgame.unique_ppid'
      ),
    };
  }

  protected query(entityIDs: string[]): JsonObject {
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
      ...this.pagination.buildQueryFields(entityIDs.length, 'event.id', 'process.parent.entity_id'),
    };
  }

  formatResponse(response: SearchResponse<ResolverEvent>): PaginatedResults {
    return {
      results: ResolverQuery.getResults(response),
      totals: PaginationBuilder.getTotals(response.aggregations),
    };
  }
}
