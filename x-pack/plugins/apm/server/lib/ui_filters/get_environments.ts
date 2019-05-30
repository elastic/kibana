/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BucketAgg, ESFilter } from 'elasticsearch';
import { idx } from '@kbn/elastic-idx';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';

export type EnvironmentUIFilterAPIResponse = PromiseReturnType<
  typeof getEnvironments
>;
export async function getEnvironments(setup: Setup, serviceName?: string) {
  const { start, end, client, config } = setup;

  const filter: ESFilter[] = [
    { terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] } },
    { range: rangeFilter(start, end) }
  ];

  if (serviceName) {
    filter.push({
      term: { [SERVICE_NAME]: serviceName }
    });
  }

  const params = {
    index: [
      config.get<string>('apm_oss.metricsIndices'),
      config.get<string>('apm_oss.errorIndices'),
      config.get<string>('apm_oss.transactionIndices')
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter
        }
      },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            missing: ENVIRONMENT_NOT_DEFINED
          }
        }
      }
    }
  };

  interface Aggs extends BucketAgg {
    environments: {
      buckets: BucketAgg[];
    };
  }

  const resp = await client.search<void, Aggs>(params);
  const aggs = resp.aggregations;
  const environmentsBuckets = idx(aggs, _ => _.environments.buckets) || [];

  const environments = environmentsBuckets.map(
    environmentBucket => environmentBucket.key
  );

  return environments;
}
