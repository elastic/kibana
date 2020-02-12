/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverQuery } from './base';

export class RelatedEventsQuery extends ResolverQuery {
  protected legacyQuery(endpointID: string, uniquePIDs: string[], index: string) {
    return {
      body: this.paginateBy('endgame.serial_event_id', {
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

  protected query(entityIDs: string[], index: string) {
    return {
      body: this.paginateBy('event.id', {
        query: {
          bool: {
            filter: [
              {
                terms: { 'endpoint.process.entity_id': entityIDs },
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
}
