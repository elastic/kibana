/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ApmServiceTransactionDocumentType } from '../../../common/document_type';
import { HOST_HOSTNAME, SERVICE_NAME } from '../../../common/es_fields/apm';
import { RollupInterval } from '../../../common/rollup';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServiceHostNames({
  apmEventClient,
  serviceName,
  start,
  end,
  environment,
  documentType,
  rollupInterval,
}: {
  environment: string;
  serviceName: string;
  start: number;
  end: number;
  apmEventClient: APMEventClient;
  documentType: ApmServiceTransactionDocumentType;
  rollupInterval: RollupInterval;
}) {
  const response = await apmEventClient.search('get_service_host_names', {
    apm: {
      sources: [{ documentType, rollupInterval }],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
          ],
        },
      },
      aggs: {
        hostNames: {
          terms: {
            field: HOST_HOSTNAME,
            size: 500,
          },
        },
      },
    },
  });

  return response.aggregations?.hostNames.buckets.map((bucket) => bucket.key as string) || [];
}
