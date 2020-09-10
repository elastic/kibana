/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { esKuery } from '../../../../../../../../src/plugins/data/server';
import { ResolverEvent } from '../../../../../common/endpoint/types';
import { ResolverQuery } from './base';
import { PaginationBuilder } from '../utils/pagination';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';

/**
 * Builds a query for retrieving alerts for a node.
 */
export class AlertsQuery extends ResolverQuery<ResolverEvent[]> {
  private readonly kqlQuery: JsonObject[] = [];
  constructor(
    private readonly pagination: PaginationBuilder,
    indexPattern: string | string[],
    endpointID?: string,
    kql?: string
  ) {
    super(indexPattern, endpointID);
    if (kql) {
      this.kqlQuery.push(esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(kql)));
    }
  }

  protected legacyQuery(endpointID: string, uniquePIDs: string[]): JsonObject {
    return {
      query: {
        bool: {
          filter: [
            ...this.kqlQuery,
            {
              terms: { 'endgame.unique_pid': uniquePIDs },
            },
            {
              term: { 'agent.id': endpointID },
            },
            {
              term: { 'event.kind': 'alert' },
            },
          ],
        },
      },
      ...this.pagination.buildQueryFields('endgame.serial_event_id', 'asc'),
    };
  }

  protected query(entityIDs: string[]): JsonObject {
    return {
      query: {
        bool: {
          filter: [
            ...this.kqlQuery,
            {
              terms: { 'process.entity_id': entityIDs },
            },
            {
              term: { 'event.kind': 'alert' },
            },
          ],
        },
      },
      ...this.pagination.buildQueryFields('event.id', 'asc'),
    };
  }

  formatResponse(response: SearchResponse<ResolverEvent>): ResolverEvent[] {
    return this.getResults(response);
  }
}
