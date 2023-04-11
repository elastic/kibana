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
import { FilteredHostsSearchAggregationResponseRT, GetHostsArgs } from './types';
import { BUCKET_KEY } from './constants';
import { assertQueryStructure } from './utils';
import { createFilters, runQuery } from './helpers/query';

export const getFilteredHosts = async ({ searchClient, sourceConfig, params }: GetHostsArgs) => {
  const queryRequest = createQuery(params, sourceConfig);

  return lastValueFrom(
    runQuery(searchClient, queryRequest, decodeOrThrow(FilteredHostsSearchAggregationResponseRT))
  );
};

const createQuery = (
  params: GetHostsRequestBodyPayload,
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
        hosts: {
          terms: {
            size: params.limit,
            field: BUCKET_KEY,
          },
        },
      },
    },
  };
};
