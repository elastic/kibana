/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchRequest } from '@kbn/es-types';
import { lastValueFrom } from 'rxjs';

import { InfraStaticSourceConfiguration } from '../../../../lib/sources';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { GetInfraMetricsRequestBodyPayload } from '../../../../../common/http_api/infra';
import {
  FilteredHostsSearchAggregationResponseRT,
  FilteredHostsSearchAggregationResponse,
  GetHostsArgs,
} from '../types';
import { BUCKET_KEY, MAX_SIZE } from '../constants';
import { assertQueryStructure } from '../utils';
import { createFilters, runQuery } from '../helpers/query';

export const getFilteredHosts = async ({
  searchClient,
  sourceConfig,
  params,
}: GetHostsArgs): Promise<FilteredHostsSearchAggregationResponse> => {
  const query = createQuery(params, sourceConfig);
  return lastValueFrom(
    runQuery(searchClient, query, decodeOrThrow(FilteredHostsSearchAggregationResponseRT))
  );
};

const createQuery = (
  params: GetInfraMetricsRequestBodyPayload,
  sourceConfig: InfraStaticSourceConfiguration
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
        nodes: {
          terms: {
            size: params.limit ?? MAX_SIZE,
            field: BUCKET_KEY,
            order: {
              _key: 'asc',
            },
          },
        },
      },
    },
  };
};
