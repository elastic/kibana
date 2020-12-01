/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ApiResponse } from '@elastic/elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { JsonObject } from '../../../../../../../../../src/plugins/kibana_utils/common';
import { EventStats, ResolverSchema } from '../../../../../../common/endpoint/types';
import { NodeID, Timerange } from '../utils/index';

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
  timerange: Timerange;
}

/**
 * Builds a query for retrieving descendants of a node.
 */
export class StatsQuery {
  private readonly schema: ResolverSchema;
  private readonly indexPatterns: string | string[];
  private readonly timerange: Timerange;
  constructor({ schema, indexPatterns, timerange }: StatsParams) {
    this.schema = schema;
    this.indexPatterns = indexPatterns;
    this.timerange = timerange;
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
                  gte: this.timerange.from,
                  lte: this.timerange.to,
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
  async search(client: IScopedClusterClient, nodes: NodeID[]): Promise<Record<string, EventStats>> {
    if (nodes.length <= 0) {
      return {};
    }

    // leaving unknown here because we don't actually need the hits part of the body
    const response: ApiResponse<SearchResponse<unknown>> = await client.asCurrentUser.search({
      body: this.query(nodes),
      index: this.indexPatterns,
    });

    return response.body.aggregations?.ids?.buckets.reduce(
      (cummulative: Record<string, number>, bucket: CategoriesAgg) => ({
        ...cummulative,
        [bucket.key]: StatsQuery.getEventStats(bucket),
      }),
      {}
    );
  }
}
