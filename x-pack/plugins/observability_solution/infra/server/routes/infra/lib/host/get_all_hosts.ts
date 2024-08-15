/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetInfraMetricsRequestBodyPayload,
  InfraAssetMetadataType,
} from '../../../../../common/http_api/infra';
import { BUCKET_KEY, MAX_SIZE, METADATA_AGGREGATION_NAME } from '../constants';
import type { GetHostsArgs } from '../types';
import { createFilters, getInventoryModelAggregations } from '../helpers/query';
import { BasicMetricValueRT } from '../../../../lib/metrics/types';

export const getAllHosts = async (
  { infraMetricsClient, params }: GetHostsArgs,
  hostNamesShortList: string[] = []
) => {
  const query = createQuery(params, hostNamesShortList);
  const response = await infraMetricsClient.search(query);

  const result = (response.aggregations?.nodes.buckets ?? [])
    .sort((a, b) => {
      const aValue = getMetricValue(a?.cpuV2) ?? 0;
      const bValue = getMetricValue(b?.cpuV2) ?? 0;
      return bValue - aValue;
    })
    .map((bucket) => {
      const metadata = (bucket?.metadata.top ?? [])
        .flatMap((top) => Object.entries(top.metrics))
        .map(([key, value]) => ({
          name: key as InfraAssetMetadataType,
          value: typeof value === 'string' && value.trim().length === 0 ? null : value,
        }));

      const metrics = params.metrics.map((metric) => ({
        name: metric.type,
        value: metric.type in bucket ? getMetricValue(bucket[metric.type]) ?? 0 : null,
      }));

      return {
        name: bucket?.key as string,
        metadata,
        metrics,
      };
    });

  return result;
};

const createQuery = (params: GetInfraMetricsRequestBodyPayload, hostNamesShortList: string[]) => {
  const metricAggregations = getInventoryModelAggregations(
    params.type,
    params.metrics.map((p) => p.type)
  );

  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: createFilters({
            params,
            hostNamesShortList,
          }),
        },
      },
      aggs: {
        nodes: {
          terms: {
            field: BUCKET_KEY,
            size: params.limit ?? MAX_SIZE,
            order: {
              _key: 'asc' as const,
            },
          },
          aggs: {
            ...metricAggregations,
            [METADATA_AGGREGATION_NAME]: {
              top_metrics: {
                metrics: [
                  {
                    field: 'host.os.name',
                  },
                  {
                    field: 'cloud.provider',
                  },
                  {
                    field: 'host.ip',
                  },
                ],
                size: 1,
                sort: {
                  '@timestamp': 'desc' as const,
                },
              },
            },
          },
        },
      },
    },
  };
};

const getMetricValue = (valueObject: unknown): number | null => {
  if (BasicMetricValueRT.is(valueObject)) {
    return valueObject.value;
  }

  return valueObject as number | null;
};
