/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { JsonObject } from '@kbn/utility-types';
import type { EventStats, ResolverSchema } from '../../../../../../common/endpoint/types';
import type { NodeID, TimeRange } from '../utils';

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
    return {
      size: includeHits ? 5000 : 0,
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
    alertsClient: AlertsClient | undefined,
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
      alertsClient
        ? await alertsClient.find(this.alertStatsQuery(nodes, alertIndex, includeHits))
        : { hits: { hits: [] } },
    ]);
    // @ts-expect-error declare aggegations type explicitly
    const eventAggs: CategoriesAgg[] = body.aggregations?.ids?.buckets ?? [];
    // @ts-expect-error declare aggegations type explicitly
    const alertAggs: AggBucket[] = alertsBody.aggregations?.ids?.buckets ?? [];
    const eventsWithAggs = new Set([
      ...eventAggs.map((agg) => agg.key),
      ...alertAggs.map((agg) => agg.key),
    ]);
    const alertsAggsMap = new Map(alertAggs.map(({ key, doc_count: docCount }) => [key, docCount]));
    const eventAggsMap = new Map<string, EventStats>(
      eventAggs.map(({ key, doc_count: docCount, categories }): [string, EventStats] => [
        key,
        {
          ...StatsQuery.getEventStats({ key, doc_count: docCount, categories }),
        },
      ])
    );
    const alertIdsRaw: Array<string | undefined> = alertsBody.hits.hits.map((hit) => hit._id);
    const alertIds = alertIdsRaw.flatMap((id) => (!id ? [] : [id]));

    const eventAggStats = [...eventsWithAggs.values()];
    const eventStats = eventAggStats.reduce(
      (cummulative: Record<string, EventStats>, id: string) => {
        const alertCount = alertsAggsMap.get(id);
        const otherEvents = eventAggsMap.get(id);
        if (alertCount !== undefined) {
          if (otherEvents !== undefined) {
            return {
              ...cummulative,
              [id]: {
                total: alertCount + otherEvents.total,
                byCategory: {
                  alert: alertCount,
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
                  alert: alertCount,
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
            return {};
          }
        }
      },
      {}
    );
    if (includeHits) {
      return { alertIds, eventStats };
    } else {
      return { eventStats };
    }
  }
}
