/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ResolverQuery } from './base';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';
import { ResolverEvent } from '../../../../../common/endpoint/types';

/**
 * Builds a query for retrieving life cycle information about a node (start, stop, etc).
 */
export class LifecycleQuery extends ResolverQuery<ResolverEvent[]> {
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
              term: { 'event.category': 'process' },
            },
          ],
        },
      },
      size: 10000,
      sort: [{ '@timestamp': 'asc' }],
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
              term: { 'event.category': 'process' },
            },
          ],
        },
      },
      size: 10000,
      sort: [{ '@timestamp': 'asc' }],
    };
  }

  formatResponse(response: SearchResponse<ResolverEvent>): ResolverEvent[] {
    return this.getResults(response);
  }
}
