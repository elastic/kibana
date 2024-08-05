/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import { InfraAssetMetadataType } from '../../../../../common/http_api';
import { METADATA_AGGREGATION_NAME } from '../constants';
import type { GetHostParameters } from '../types';
import { getFilterByIntegration, getInventoryModelAggregations } from '../helpers/query';
import { BasicMetricValueRT } from '../../../../lib/metrics/types';

export const getAllHosts = async ({
  infraMetricsClient,
  from,
  to,
  limit,
  type,
  metrics,
  hostNamesShortList,
}: Pick<GetHostParameters, 'infraMetricsClient' | 'from' | 'to' | 'limit' | 'type' | 'metrics'> & {
  hostNamesShortList: string[];
}) => {
  const metricAggregations = getInventoryModelAggregations(
    type,
    metrics.map((metric) => metric)
  );

  const response = await infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termsQuery(HOST_NAME_FIELD, ...hostNamesShortList),
            ...rangeQuery(from, to),
            ...getFilterByIntegration('system'),
          ],
        },
      },
      aggs: {
        nodes: {
          terms: {
            field: HOST_NAME_FIELD,
            size: limit,
            order: {
              _key: 'asc',
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
                  '@timestamp': 'desc',
                },
              },
            },
          },
        },
      },
    },
  });

  const result = (response.aggregations?.nodes.buckets ?? [])
    .sort((a, b) => {
      const aValue = getMetricValue(a?.cpu) ?? 0;
      const bValue = getMetricValue(b?.cpu) ?? 0;
      return bValue - aValue;
    })
    .map((bucket) => {
      const metadata = (bucket?.metadata.top ?? [])
        .flatMap((top) => Object.entries(top.metrics))
        .map(([key, value]) => ({
          name: key as InfraAssetMetadataType,
          value: typeof value === 'string' && value.trim().length === 0 ? null : value,
        }));

      return {
        name: bucket?.key as string,
        metadata,
        metrics: metrics.map((metric) => ({
          name: metric,
          value: metric in bucket ? getMetricValue(bucket[metric]) ?? 0 : null,
        })),
      };
    });

  return result;
};

const getMetricValue = (valueObject: unknown): number | null => {
  if (BasicMetricValueRT.is(valueObject)) {
    return valueObject.value;
  }

  return valueObject as number | null;
};
