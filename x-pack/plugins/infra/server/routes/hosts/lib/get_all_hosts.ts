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
import { BUCKET_KEY, MAX_SIZE, METADATA_AGGREGATION } from './constants';
import {
  GetHostsArgs,
  HostsMetricsSearchAggregationResponse,
  HostsMetricsSearchAggregationResponseRT,
} from './types';
import { createFilters, getInventoryModelAggregations, runQuery } from './helpers/query';

export const getAllHosts = async (
  { searchClient, sourceConfig, params }: GetHostsArgs,
  hostNamesShortList: string[] = []
): Promise<HostsMetricsSearchAggregationResponse> => {
  const query = createQuery(params, sourceConfig, hostNamesShortList);
  return lastValueFrom(
    runQuery(searchClient, query, decodeOrThrow(HostsMetricsSearchAggregationResponseRT))
  );
};

const createQuery = (
  params: GetHostsRequestBodyPayload,
  sourceConfig: InfraStaticSourceConfiguration,
  hostNamesShortList: string[]
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
      aggs: createAggregations(params, metricAggregations),
    },
  };
};

const createAggregations = (
  { limit }: GetHostsRequestBodyPayload,
  metricAggregations: Record<string, estypes.AggregationsAggregationContainer>
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    hosts: {
      terms: {
        field: BUCKET_KEY,
        size: limit ?? MAX_SIZE,
        order: {
          _key: 'asc',
        },
      },
      aggs: {
        ...metricAggregations,
        ...METADATA_AGGREGATION,
      },
    },
  };
};
