/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ResolverQuery } from './base';
import { ResolverEvent, EventStats } from '../../../../../common/endpoint/types';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/public';
import { AggBucket } from '../utils/pagination';

export interface StatsResult {
  alerts: Record<string, number>;
  events: Record<string, EventStats>;
}

interface CategoriesAgg extends AggBucket {
  categories?: {
    buckets?: AggBucket[];
  };
}

export class StatsQuery extends ResolverQuery<StatsResult> {
  protected legacyQuery(endpointID: string, uniquePIDs: string[]): JsonObject {
    return {
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
            ids: {
              terms: {
                field: 'endgame.data.alert_details.acting_process.unique_pid',
                size: uniquePIDs.length,
              },
            },
          },
        },
        events: {
          filter: { term: { 'event.kind': 'event' } },
          aggs: {
            ids: {
              terms: { field: 'endgame.unique_pid', size: uniquePIDs.length },
              aggs: {
                categories: {
                  terms: { field: 'event.category', size: 1000 },
                },
              },
            },
          },
        },
      },
    };
  }

  protected query(entityIDs: string[]): JsonObject {
    return {
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
            ids: { terms: { field: 'process.entity_id', size: entityIDs.length } },
          },
        },
        events: {
          filter: { term: { 'event.kind': 'event' } },
          aggs: {
            ids: {
              // The entityIDs array will be made up of alert and event entity_ids, so we're guaranteed that there
              // won't be anymore unique process.entity_ids than the size of the array passed in
              terms: { field: 'process.entity_id', size: entityIDs.length },
              aggs: {
                categories: {
                  // Currently ECS defines a small number of valid categories (under 10 right now), as ECS grows it's possible that the
                  // valid categories could exceed this hardcoded limit. If that happens we might want to revisit this
                  // and transition it to a composite aggregation so that we can paginate through all the possible response
                  terms: { field: 'event.category', size: 1000 },
                },
              },
            },
          },
        },
      },
    };
  }

  private static getEventStats(catAgg: CategoriesAgg): EventStats {
    const total = catAgg.doc_count;
    if (!catAgg.categories?.buckets) {
      return {
        total,
        categories: {},
      };
    }

    const categories: Record<string, number> = catAgg.categories.buckets.reduce(
      (cummulative: Record<string, number>, bucket: AggBucket) => ({
        ...cummulative,
        [bucket.key]: bucket.doc_count,
      }),
      {}
    );
    return {
      total,
      categories,
    };
  }

  public formatResponse(response: SearchResponse<ResolverEvent>): StatsResult {
    let alerts: Record<string, number> = {};

    if (response.aggregations?.alerts?.ids?.buckets) {
      alerts = response.aggregations.alerts.ids.buckets.reduce(
        (cummulative: Record<string, number>, bucket: AggBucket) => ({
          ...cummulative,
          [bucket.key]: bucket.doc_count,
        }),
        {}
      );
    }

    let events: Record<string, EventStats> = {};
    if (response.aggregations?.events?.ids?.buckets) {
      events = response.aggregations.events.ids.buckets.reduce(
        (cummulative: Record<string, number>, bucket: CategoriesAgg) => ({
          ...cummulative,
          [bucket.key]: StatsQuery.getEventStats(bucket),
        }),
        {}
      );
    }

    return {
      alerts,
      events,
    };
  }
}
