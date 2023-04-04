/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchRequest } from '@kbn/es-types';
import { lastValueFrom } from 'rxjs';

import { decodeOrThrow } from '../../../../common/runtime_types';
import { InfraSource } from '../../../../common/source_configuration/source_configuration';
import { GetHostsRequestBodyPayload } from '../../../../common/http_api/hosts';
import { HostsRandomSamplerAggregationResponseRT, GetHostsArgs } from './types';
import { BUCKET_KEY } from './constants';
import { parseFilters } from './utils';
import { createFilters, runQuery } from './helpers/query';

export const getFilteredHosts = async ({ searchClient, source, params }: GetHostsArgs) => {
  const queryRequest = createQuery(params, source);

  return lastValueFrom(
    runQuery(searchClient, queryRequest, decodeOrThrow(HostsRandomSamplerAggregationResponseRT))
  );
};

const createQuery = (params: GetHostsRequestBodyPayload, source: InfraSource): ESSearchRequest => {
  const parsedFilters = parseFilters(params.query);

  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: source.configuration.metricAlias,
    body: {
      size: 0,
      query: {
        bool: {
          ...parsedFilters.bool,
          filter: [
            ...(Array.isArray(parsedFilters.bool?.filter) ? parsedFilters.bool?.filter ?? [] : []),
            ...createFilters({ params }),
          ],
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
