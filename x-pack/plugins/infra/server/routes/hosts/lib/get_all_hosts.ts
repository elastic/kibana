/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { lastValueFrom } from 'rxjs';
import { ESSearchRequest } from '@kbn/es-types';
import { InfraStaticSourceConfiguration } from '../../../lib/sources';
import { decodeOrThrow } from '../../../../common/runtime_types';
import { GetHostsRequestBodyPayload } from '../../../../common/http_api/hosts';
import {
  BUCKET_KEY,
  COMPOSITE_DEFAULT_SIZE,
  METADATA_AGGREGATION,
  COMPOSITE_KEY,
} from './constants';
import {
  AfterKey,
  GetHostsArgs,
  HostsMetricsSearchCompositeAggregationResponse,
  HostsMetricsSearchCompositeAggregationResponseRT,
} from './types';
import {
  createFilters,
  getAfterKey,
  getInventoryModelAggregations,
  runQuery,
} from './helpers/query';

export const getAllHosts = async (
  { searchClient, sourceConfig, params }: GetHostsArgs,
  hostNamesShortList: string[] = [],
  response?: HostsMetricsSearchCompositeAggregationResponse,
  afterKey?: AfterKey | null
): Promise<HostsMetricsSearchCompositeAggregationResponse> => {
  const limitReached = params.limit && (response?.hosts.buckets.length ?? 0) >= params.limit;
  if (response && (!afterKey || limitReached)) {
    return response;
  }

  const query = createQuery(params, sourceConfig, hostNamesShortList, afterKey);
  const current = await lastValueFrom(
    runQuery(searchClient, query, decodeOrThrow(HostsMetricsSearchCompositeAggregationResponseRT))
  );

  const combined: HostsMetricsSearchCompositeAggregationResponse = {
    ...current,
    hosts: {
      ...response?.hosts,
      buckets: [...(response?.hosts.buckets ?? []), ...(current?.hosts.buckets ?? [])],
      after_key: current?.hosts.after_key,
    },
  };

  return getAllHosts(
    { searchClient, sourceConfig, params },
    hostNamesShortList,
    combined,
    current?.hosts.after_key
  );
};

const createQuery = (
  params: GetHostsRequestBodyPayload,
  sourceConfig: InfraStaticSourceConfiguration,
  hostNamesShortList: string[],
  afterKey?: AfterKey
): ESSearchRequest => {
  const metricAggregations = getInventoryModelAggregations(params.metrics.map((p) => p.type));

  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: sourceConfig.metricAlias,
    body: {
      size: 0,
      query: {
        bool: {
          filter: createFilters({
            params,
            hostNamesShortList,
          }),
        },
      },
      aggs: createCompositeAggregations(params, metricAggregations, afterKey),
    },
  };
};

const createCompositeAggregations = (
  { limit }: GetHostsRequestBodyPayload,
  metricAggregations: Record<string, estypes.AggregationsAggregationContainer>,
  afterKey?: AfterKey
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    hosts: {
      composite: {
        size: limit ?? COMPOSITE_DEFAULT_SIZE,
        sources: [
          {
            [COMPOSITE_KEY]: {
              terms: { field: BUCKET_KEY },
            },
          },
        ],
        ...(getAfterKey(COMPOSITE_KEY, afterKey) ?? {}),
      },
      aggs: {
        ...metricAggregations,
        ...METADATA_AGGREGATION,
      },
    },
  };
};
