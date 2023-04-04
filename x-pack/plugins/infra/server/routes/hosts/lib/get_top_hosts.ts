/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { ESSearchRequest } from '@kbn/es-types';
import { InfraSource } from '../../../../common/source_configuration/source_configuration';
import { decodeOrThrow } from '../../../../common/runtime_types';
import { GetHostsRequestBodyPayload, HostMetricType } from '../../../../common/http_api/hosts';
import { BUCKET_KEY } from './constants';
import { HostsRandomSamplerAggregationResponseRT, GetHostsArgs } from './types';
import { metricsAggregationFormulas } from './metric_aggregation_formulas';
import { createFilters, runQuery } from './helpers/query';

export const getTopHostsByMetric = (
  { searchClient, source, params }: GetHostsArgs,
  filteredHostNames: string[] = []
) => {
  const query = createQuery(params, source, filteredHostNames);
  return lastValueFrom(
    runQuery(searchClient, query, decodeOrThrow(HostsRandomSamplerAggregationResponseRT))
  );
};

const createQuery = (
  params: GetHostsRequestBodyPayload,
  source: InfraSource,
  filteredHostNames: string[] = []
): ESSearchRequest => {
  if (!params.sortField || !params.sortDirection) {
    throw new Error();
  }

  const {
    filter: formulaFilter,
    aggregation,
    runtimeField,
  } = metricsAggregationFormulas[params.sortField as HostMetricType];

  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: source.configuration.metricAlias,
    body: {
      size: 0,
      query: {
        bool: {
          ...formulaFilter.bool,
          filter: [...createFilters({ params, filteredHostNames, extraFilter: formulaFilter })],
        },
      },
      runtime_mappings: runtimeField,
      aggs: {
        hosts: {
          terms: {
            field: BUCKET_KEY,
            order: { [params.sortField ?? '_key']: params.sortDirection },
            size: filteredHostNames.length > 0 ? filteredHostNames.length : params.limit,
          },
          aggs: { [params.sortField]: { ...aggregation } },
        },
      },
    },
  };
};
