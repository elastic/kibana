/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BucketAgg } from 'elasticsearch';
import { idx } from '@kbn/elastic-idx/target';
import { Setup } from '../../helpers/setup_request';
import { PromiseReturnType } from '../../../../typings/common';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../common/elasticsearch_fieldnames';

export type CMServicesAPIResponse = PromiseReturnType<typeof getServiceNames>;
export async function getServiceNames({ setup }: { setup: Setup }) {
  const { client, config } = setup;

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
          filter: [
            { terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] } }
          ]
        }
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 100
          }
        }
      }
    }
  };

  interface Aggs extends BucketAgg {
    services: {
      buckets: BucketAgg[];
    };
  }

  const resp = await client<void, Aggs>('search', params);
  const aggs = resp.aggregations;
  const buckets = idx(aggs, _ => _.services.buckets) || [];
  return buckets.map(bucket => bucket.key);
}
