/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverQuery } from './base';

export class RelatedEventsQuery extends ResolverQuery {
  protected legacyQuery(endpointID: string, uniquePID: string, index: string) {
    return this.paginateBy('endgame.serial_event_id', {
      query: {
        bool: {
          filter: [
            {
              term: { 'endgame.unique_pid': uniquePID },
            },
            {
              match: { 'agent.id': endpointID },
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
      aggs: {
        total: {
          cardinality: {
            field: '_id',
          },
        },
      },
      index,
    });
  }

  protected query(entityID: string, index: string) {
    return this.paginateBy('event.id', {
      query: {
        bool: {
          filter: [
            {
              match: { 'endpoint.process.entity_id': entityID },
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
      aggs: {
        total: {
          cardinality: {
            field: '_id',
          },
        },
      },
      index,
    });
  }
}
