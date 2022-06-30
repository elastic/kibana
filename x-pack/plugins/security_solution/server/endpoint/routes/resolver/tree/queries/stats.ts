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

  private alertStatsQuery(nodes: NodeID[], index: string): JsonObject {
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
      //search_after: undefined,
      index,
      aggs: {
        ids: {
          terms: { field: this.schema.id },
        },
      },
    };
  }

  private static getEventStats(catAgg: CategoriesAgg, alertsBody): EventStats {
    console.log(catAgg, alertsBody);
    const eventId = catAgg.key;
    const eventAlertCount = alertsBody.find(({ key }) => key === eventId).doc_count;
    const total = catAgg.doc_count + eventAlertCount;
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
      byCategory:
        eventAlertCount && eventAlertCount > 0
          ? { ...byCategory, alerts: eventAlertCount }
          : byCategory,
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
    alertsClient: AlertsClient
  ): Promise<Record<string, EventStats>> {
    if (nodes.length <= 0) {
      return {};
    }

    const esClient = this.isInternalRequest ? client.asInternalUser : client.asCurrentUser;
    const alertIndex =
      typeof this.indexPatterns === 'string' ? this.indexPatterns : this.indexPatterns.join(',');

    // leaving unknown here because we don't actually need the hits part of the body
    const [body, alertsBody] = await Promise.all([
      await esClient.search({
        body: this.query(nodes),
        index: this.indexPatterns,
      }),
      await alertsClient.find(this.alertStatsQuery(nodes, alertIndex)),
    ]);
    const alertsAggs = alertsBody.aggregations?.ids.buckets;
    // @ts-expect-error declare aggegations type explicitly
    return body.aggregations?.ids?.buckets.reduce(
      (cummulative: Record<string, number>, bucket: CategoriesAgg) => ({
        ...cummulative,
        [bucket.key]: StatsQuery.getEventStats(bucket, alertsAggs),
      }),
      {}
    );
  }
}
