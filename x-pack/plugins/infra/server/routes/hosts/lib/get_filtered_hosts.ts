/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchRequest } from '@kbn/es-types';
import { lastValueFrom } from 'rxjs';

import { InfraStaticSourceConfiguration } from '../../../lib/sources';
import { decodeOrThrow } from '../../../../common/runtime_types';
import { GetHostsRequestBodyPayload } from '../../../../common/http_api/hosts';
import {
  AfterKey,
  FilteredHostsSearchAggregationResponse,
  FilteredHostsSearchAggregationResponseRT,
  GetHostsArgs,
} from './types';
import { BUCKET_KEY, COMPOSITE_KEY, COMPOSITE_DEFAULT_SIZE } from './constants';
import { assertQueryStructure } from './utils';
import { createFilters, getAfterKey, runQuery } from './helpers/query';

export const getFilteredHosts = async (
  { searchClient, sourceConfig, params }: GetHostsArgs,
  response?: FilteredHostsSearchAggregationResponse,
  afterKey?: AfterKey | null
): Promise<FilteredHostsSearchAggregationResponse> => {
  const limitReached = params.limit && (response?.hosts.buckets.length ?? 0) >= params.limit;
  if (response && (!afterKey || limitReached)) {
    return response;
  }

  const query = createQuery(params, sourceConfig, afterKey);
  const current = await lastValueFrom(
    runQuery(searchClient, query, decodeOrThrow(FilteredHostsSearchAggregationResponseRT))
  );

  const combined: FilteredHostsSearchAggregationResponse = {
    ...current,
    hosts: {
      ...response?.hosts,
      buckets: [...(response?.hosts.buckets ?? []), ...(current?.hosts.buckets ?? [])],
      after_key: current?.hosts.after_key,
    },
  };

  return getFilteredHosts(
    { searchClient, sourceConfig, params },
    combined,
    current?.hosts.after_key
  );
};

const createQuery = (
  params: GetHostsRequestBodyPayload,
  sourceConfig: InfraStaticSourceConfiguration,
  afterKey?: AfterKey
): ESSearchRequest => {
  assertQueryStructure(params.query);

  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: sourceConfig.metricAlias,
    body: {
      size: 0,
      query: {
        bool: {
          ...params.query.bool,
          filter: createFilters({ params, extraFilter: params.query }),
        },
      },
      aggs: {
        hosts: {
          composite: {
            size: params.limit ?? COMPOSITE_DEFAULT_SIZE,
            sources: [
              {
                [COMPOSITE_KEY]: {
                  terms: { field: BUCKET_KEY },
                },
              },
            ],
            ...(getAfterKey(COMPOSITE_KEY, afterKey) ?? {}),
          },
        },
      },
    },
  };
};
