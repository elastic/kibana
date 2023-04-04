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
import { GetHostsRequestParams } from '../../../../common/http_api/hosts';
import { HostsRandomSamplerAggregationResponseRT, GetHostsArgs } from './types';
import { BUCKET_KEY } from './constants';
import { parseFilters } from './utils';
import { createFilters, createRandomSampler, runQuery } from './helpers/query';

export const getFilteredHosts = async ({ searchClient, source, params, seed }: GetHostsArgs) => {
  const queryRequest = createQuery(params, source, seed);

  return lastValueFrom(
    runQuery(searchClient, queryRequest, decodeOrThrow(HostsRandomSamplerAggregationResponseRT))
  );
};

const createQuery = (
  params: GetHostsRequestParams,
  source: InfraSource,
  seed: number
): ESSearchRequest => {
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
            ...createFilters(params),
          ],
        },
      },
      aggs: {
        group: {
          random_sampler: createRandomSampler(seed),
          aggs: {
            hosts: {
              terms: {
                size: params.limit,
                field: BUCKET_KEY,
              },
            },
          },
        } as any,
      },
    },
  };
};
