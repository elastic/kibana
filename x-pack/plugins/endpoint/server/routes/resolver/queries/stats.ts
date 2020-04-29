/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ResolverQuery } from './base';
import { ResolverEvent } from '../../../../common/types';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { PaginatedResults } from '../utils/pagination';

export class StatsQuery extends ResolverQuery {
  protected postSearch(response: SearchResponse<ResolverEvent>): PaginatedResults {
    const alerts = response.aggregations.alerts.ids.buckets.reduce(
      (cummulative: any, bucket: any) => ({ ...cummulative, [bucket.key]: bucket.doc_count }),
      {}
    );
    const events = response.aggregations.events.ids.buckets.reduce(
      (cummulative: any, bucket: any) => ({ ...cummulative, [bucket.key]: bucket.doc_count }),
      {}
    );
    return {
      totals: {},
      results: [],
      extras: {
        alerts,
        events,
      },
    };
  }

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
              {
                bool: {
                  should: [
                    {
                      bool: {
                        filter: [
                          { term: { 'event.kind': 'event' } },
                          { terms: { 'endgame.unique_pid': uniquePIDs } },
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
                    {
                      bool: {
                        filter: [
                          { term: { 'event.kind': 'alert' } },
                          {
                            terms: {
                              'endgame.data.alert_details.acting_process.unique_pid': uniquePIDs,
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          alerts: {
            filter: { term: { 'event.kind': 'alert' } },
            aggs: {
              ids: { terms: { field: 'endgame.data.alert_details.acting_process.unique_pid' } },
            },
          },
          events: {
            filter: { term: { 'event.kind': 'event' } },
            aggs: {
              ids: { terms: { field: 'endgame.unique_pid' } },
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
              { terms: { 'process.entity_id': entityIDs } },
              {
                bool: {
                  should: [
                    {
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
                    { term: { 'event.kind': 'alert' } },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          alerts: {
            filter: { term: { 'event.kind': 'alert' } },
            aggs: {
              ids: { terms: { field: 'process.entity_id' } },
            },
          },
          events: {
            filter: { term: { 'event.kind': 'event' } },
            aggs: {
              ids: { terms: { field: 'process.entity_id' } },
            },
          },
        },
      },
      index,
    };
  }
}
