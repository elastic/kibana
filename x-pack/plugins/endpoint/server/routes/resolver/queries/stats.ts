/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverQuery } from './base';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';

export class StatsQuery extends ResolverQuery {
  protected legacyQuery(endpointID: string, uniquePIDs: string[], index: string): JsonObject {
    return {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: { 'agent.id': endpointID },
              },
              // probably an or query below
              {
                terms: { 'endgame.unique_pid': uniquePIDs },
              },
            ],
          },
        },
        aggs: {
          alerts: {
            filter: { term: { 'event.kind': 'alert' } },
            aggs: {
              ids: { terms: 'unique_id' },
            },
          },
          events: {
            filter: {
              bool: {
                filter: [
                  { term: { 'event.kind': 'event' } },
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
              ids: { terms: 'unique_id' },
            },
          },
        },
      },
      index,
    };
  }

  protected query(entityIDs: string[], index: string): JsonObject {
    return {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                terms: { 'process.entity_id': entityIDs },
              },
            ],
          },
        },
        aggs: {
          alerts: {
            filter: { term: { 'event.kind': 'alert' } },
            aggs: {
              ids: { terms: 'unique_id' },
            },
          },
          events: {
            filter: {
              bool: {
                filter: [
                  { term: { 'event.kind': 'event' } },
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
              ids: { terms: 'unique_id' },
            },
          },
        },
      },
      index,
    };
  }
}
