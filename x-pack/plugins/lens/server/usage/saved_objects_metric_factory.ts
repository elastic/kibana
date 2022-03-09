/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsAggregationContainer,
  MappingRuntimeFields,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from 'kibana/server';
import { GenericSavedUsage } from './types';

export function createMetricQuery(
  getEsClient: () => Promise<ElasticsearchClient>,
  kibanaIndex: string
) {
  return async function ({
    aggregations,
    runtimeMappings,
    bucketsToObject,
  }: {
    aggregations: Record<string, AggregationsAggregationContainer>;
    runtimeMappings?: MappingRuntimeFields;
    bucketsToObject?: (arg: unknown) => Record<string, number>;
  }): Promise<GenericSavedUsage> {
    const esClient = await getEsClient();
    const results = await esClient.search({
      index: kibanaIndex,
      body: {
        query: {
          bool: {
            filter: [{ term: { type: 'lens' } }],
          },
        },
        aggs: {
          groups: {
            filters: {
              filters: {
                last30: { bool: { filter: { range: { updated_at: { gte: 'now-30d' } } } } },
                last90: { bool: { filter: { range: { updated_at: { gte: 'now-90d' } } } } },
                overall: { match_all: {} },
              },
            },
            aggs: {
              ...aggregations,
            },
          },
        },
        runtime_mappings: {
          ...runtimeMappings,
        },
        size: 0,
      },
    });

    // @ts-expect-error specify aggregations type explicitly
    const buckets = results.aggregations.groups.buckets;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function bucketsToObjectFallback(arg: any) {
      const obj: Record<string, number> = {};
      const key = Object.keys(arg).find((argKey) => arg[argKey]?.buckets?.length);
      if (key) {
        arg[key].buckets.forEach((bucket: { key: string; doc_count: number }) => {
          obj[bucket.key] = bucket.doc_count + (obj[bucket.key] ?? 0);
        });
      }
      return obj;
    }

    const mapFn = bucketsToObject ?? bucketsToObjectFallback;

    return {
      saved_overall: mapFn(buckets.overall),
      saved_30_days: mapFn(buckets.last30),
      saved_90_days: mapFn(buckets.last90),
      saved_overall_total: buckets.overall.doc_count,
      saved_30_days_total: buckets.last30.doc_count,
      saved_90_days_total: buckets.last90.doc_count,
    };
  };
}
