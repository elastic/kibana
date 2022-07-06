/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { JsonObject } from '@kbn/utility-types';
import { EventStats, ResolverSchema } from '../../../../../../common/endpoint/types';
import { NodeID, TimeRange } from '../utils';

interface AggBucket {
  key: string;
  doc_count: number;
}

interface CategoriesAgg extends AggBucket {
  /**
   * The reason categories is optional here is because if no data was returned in the query the categories aggregation
   * will not be defined on the response (because it's a sub aggregation).
   */
  categories?: {
    buckets?: AggBucket[];
  };
}

interface StatsParams {
  schema: ResolverSchema;
  indexPatterns: string | string[];
  timeRange: TimeRange;
  isInternalRequest: boolean;
}

/**
 * Builds a query for retrieving descendants of a node.
 */
export class StatsQuery {
  private readonly schema: ResolverSchema;
  private readonly indexPatterns: string | string[];
  private readonly timeRange: TimeRange;
  private readonly isInternalRequest: boolean;

  constructor({ schema, indexPatterns, timeRange, isInternalRequest }: StatsParams) {
    this.schema = schema;
    this.indexPatterns = indexPatterns;
    this.timeRange = timeRange;
    this.isInternalRequest = isInternalRequest;
  }

  private query(nodes: NodeID[]): JsonObject {
    return {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: this.timeRange.from,
                  lte: this.timeRange.to,
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              terms: { [this.schema.id]: nodes },
            },
            {
              term: { 'event.kind': 'event' },
            },
            {
              bool: {
                must_not: {
                  term: {
                    'event.category': 'process',
                  },
                },
              },
            },
          ],
        },
      },
      aggs: {
        ids: {
          terms: { field: this.schema.id, size: nodes.length },
          aggs: {
            categories: {
              terms: { field: 'event.category', size: 1000 },
            },
          },
        },
      },
    };
  }

  private alertStatsQuery(
    nodes: NodeID[],
    index: string,
    includeHits: boolean
  ): { size: number; query: object; index: string; aggs: object; fields?: string[] } {
    if (includeHits) {
      return {
        size: 5000,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: this.timeRange.from,
                    lte: this.timeRange.to,
                    format: 'strict_date_optional_time',
                  },
                },
              },
              {
                terms: { [this.schema.id]: nodes },
              },
            ],
          },
        },
        index,
        aggs: {
          ids: {
            terms: { field: this.schema.id },
          },
        },
      };
    } else {
      return {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: this.timeRange.from,
                    lte: this.timeRange.to,
                    format: 'strict_date_optional_time',
                  },
                },
              },
              {
                terms: { [this.schema.id]: nodes },
              },
            ],
          },
        },
        index,
        aggs: {
          ids: {
            terms: { field: this.schema.id },
          },
        },
      };
    }
  }

  private static getEventStats(catAgg: CategoriesAgg): EventStats {
    const total = catAgg.doc_count;
    if (!catAgg.categories?.buckets) {
      return {
        total,
        byCategory: {},
      };
    }

    const byCategory: Record<string, number> = catAgg.categories.buckets.reduce(
      (cummulative: Record<string, number>, bucket: AggBucket) => ({
        ...cummulative,
        [bucket.key]: bucket.doc_count,
      }),
      {}
    );
    return {
      total,
      byCategory,
    };
  }

  /**
   * Returns the related event statistics for a set of nodes.
   * @param client used to make requests to Elasticsearch
   * @param nodes an array of unique IDs representing nodes in a resolver graph
   */
  async search(
    client: IScopedClusterClient,
    nodes: NodeID[],
    alertsClient: AlertsClient,
    includeHits: boolean
  ): Promise<{ eventStats?: Record<string, EventStats>; alertIds?: string[] }> {
    if (nodes.length <= 0) {
      return {};
    }

    const esClient = this.isInternalRequest ? client.asInternalUser : client.asCurrentUser;
    const alertIndex =
      typeof this.indexPatterns === 'string' ? this.indexPatterns : this.indexPatterns.join(',');

    const [body, alertsBody] = await Promise.all([
      await esClient.search({
        body: this.query(nodes),
        index: this.indexPatterns,
      }),
      await alertsClient.find(this.alertStatsQuery(nodes, alertIndex, includeHits)),
    ]);
    const eventAggs = body.aggregations?.ids?.buckets ?? [];
    const alertAggs = alertsBody.aggregations?.ids?.buckets ?? [];
    const eventsWithAggs = new Set([
      ...eventAggs.map((agg) => agg.key),
      ...alertAggs.map((agg) => agg.key),
    ]);
    const alertsAggsMap = new Map(
      alertsBody.aggregations?.ids.buckets.map(({ key, doc_count }) => [key, doc_count])
    );
    const eventAggsMap = new Map(
      eventAggs.map(({ key, doc_count, categories }) => [
        key,
        {
          ...StatsQuery.getEventStats({ key, doc_count, categories }),
        },
      ])
    );
    const alertIds = alertsBody.hits.hits
      .map((hit) => {
        return hit._source['kibana.alert.uuid'];
      })
      .filter((hit) => hit !== undefined);
    const eventStats = [...eventsWithAggs.values()].reduce(
      (cummulative: Record<string, number>, id: string) => {
        const alertCount = alertsAggsMap.get(id);
        const otherEvents = eventAggsMap.get(id);
        if (alertCount !== undefined) {
          if (otherEvents !== undefined) {
            return {
              ...cummulative,
              [id]: {
                total: alertCount + otherEvents.total,
                byCategory: {
                  alerts: alertCount,
                  ...otherEvents.byCategory,
                },
              },
            };
          } else {
            return {
              ...cummulative,
              [id]: {
                total: alertCount,
                byCategory: {
                  alerts: alertCount,
                },
              },
            };
          }
        } else {
          if (otherEvents !== undefined) {
            return {
              ...cummulative,
              [id]: {
                total: otherEvents.total,
                byCategory: otherEvents.byCategory,
              },
            };
          } else {
            return {
              total: 0,
              byCategory: {},
            };
          }
        }
      },
      includeHits ? { alertIds } : {}
    );
    if (includeHits) {
      return { alertIds, eventStats };
    } else {
      return { eventStats };
    }
  }
}
