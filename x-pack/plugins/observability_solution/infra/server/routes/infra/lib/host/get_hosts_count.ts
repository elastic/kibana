/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { castArray } from 'lodash';
import { estypes } from '@elastic/elasticsearch';
import { ApmDataAccessServicesWrapper } from '../../../../lib/helpers/get_apm_data_access_services';
import { GetInfraAssetCountRequestBodyPayload } from '../../../../../common/http_api';
import { InfraMetricsClient } from '../../../../lib/helpers/get_infra_metrics_client';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import { assertQueryStructure } from '../utils';
import { maybeGetHostsFromApm } from './get_apm_host_names';
import { getFilterByIntegration } from '../helpers/query';

export async function getHostsCount({
  infraMetricsClient,
  apmDataAccessServices,
  query,
  from,
  to,
}: GetInfraAssetCountRequestBodyPayload & {
  infraMetricsClient: InfraMetricsClient;
  apmDataAccessServices: ApmDataAccessServicesWrapper;
}) {
  assertQueryStructure(query);

  const apmHostNames = await maybeGetHostsFromApm({
    infraMetricsClient,
    apmDataAccessServices,
    from,
    to,
    query,
  });

  const filters: estypes.QueryDslQueryContainer[] =
    apmHostNames.length > 0
      ? [
          {
            bool: {
              should: [...termsQuery(HOST_NAME_FIELD, ...apmHostNames), ...castArray(query)],
            },
          },
        ]
      : castArray(query);
  // apmHostNames.length > 0 ? termsQuery(HOST_NAME_FIELD, ...apmHostNames) : castArray(query);

  const result = await infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...filters, ...rangeQuery(from, to), ...getFilterByIntegration('system')],
        },
      },
      aggs: {
        count: {
          cardinality: {
            field: HOST_NAME_FIELD,
          },
        },
      },
    },
  });

  return result.aggregations?.count.value ?? 0;
}
