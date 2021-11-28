/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError } from 'axios';
import { Fields } from '@elastic/apm-synthtrace';
import { ProcessorEvent } from '../../common/processor_event';
import { callApmApi } from './call_apm_api';

export async function callApmEndpoints({
  kibanaUrl,
  traceEvents,
  serviceName,
  start,
  end,
  environment,
}: {
  kibanaUrl: string;
  traceEvents: Fields[];
  serviceName: string;
  start: string;
  end: string;
  environment: string;
}) {
  const kuery = '';
  const backendName = 'my-backend';
  const agentName = 'nodejs';
  const transactionType = 'request';

  const kibanaUrlWithBasePath = await getKibanaUrlWithBasePath(kibanaUrl);
  axios.defaults.baseURL = kibanaUrlWithBasePath;

  const transactionEvent = traceEvents.find(
    (traceEvent) => traceEvent['processor.event'] === 'transaction'
  );

  const errorEvent = traceEvents.find(
    (traceEvent) => traceEvent['processor.event'] === 'error'
  );

  const promises = [
    callApmApi({
      endpoint: 'GET /internal/apm/alerts/chart_preview/transaction_duration',
      params: {
        query: {
          start,
          end,
          environment,
          interval: '1m',
        },
      },
    }),
    callApmApi({
      endpoint:
        'GET /internal/apm/alerts/chart_preview/transaction_error_count',
      params: {
        query: {
          start,
          end,
          environment,
          interval: '1m',
        },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/alerts/chart_preview/transaction_error_rate',
      params: {
        query: {
          start,
          end,
          environment,
          interval: '1m',
        },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/backends/charts/error_rate',
      params: {
        query: { start, end, environment, kuery, backendName },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/backends/charts/latency',
      params: {
        query: { start, end, environment, kuery, backendName },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/backends/charts/throughput',
      params: {
        query: { start, end, environment, kuery, backendName },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/backends/metadata',
      params: {
        query: { start, end, backendName },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/backends/top_backends',
      params: {
        query: { start, end, environment, kuery, numBuckets: 10 },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/backends/upstream_services',
      params: {
        query: {
          start,
          end,
          environment,
          kuery,
          backendName,
          numBuckets: 10,
        },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/correlations/field_candidates',
      params: {
        query: { start, end, environment, kuery },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/data_view/dynamic',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/environments',
      params: {
        query: { start, end },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/event_metadata/{processorEvent}/{id}',
      params: {
        path: {
          processorEvent: ProcessorEvent.transaction,
          id: 'tranasction-id',
        },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/fallback_to_transactions',
      params: {
        query: { start, end, kuery },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/fleet/agents',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/fleet/apm_server_schema/unsupported',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/fleet/has_data',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/fleet/migration_check',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/has_data',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/observability_overview',
      params: {
        query: { start, end, bucketSize: 60, intervalString: '1m' },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/observability_overview/has_data',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/service-map',
      params: {
        query: { start, end, environment },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/service-map/backend',
      params: {
        query: { start, end, environment, backendName },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/service-map/service/{serviceName}',
      params: {
        path: { serviceName },
        query: { start, end, environment },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services',
      params: {
        query: { start, end, environment, kuery },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/agent',
      params: {
        path: { serviceName },
        query: { start, end },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/alerts',
      params: {
        path: { serviceName },
        query: { start, end, environment, transactionType },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/dependencies',
      params: {
        path: { serviceName },
        query: { start, end, environment, numBuckets: 10 },
      },
    }),
    callApmApi({
      endpoint:
        'GET /internal/apm/services/{serviceName}/dependencies/breakdown',
      params: {
        path: { serviceName },
        query: { start, end, environment, kuery },
      },
    }),
    callApmApi({
      endpoint:
        'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
      params: {
        path: { serviceName },
        query: { start, end, environment, kuery, transactionType },
      },
    }),
    callApmApi({
      endpoint:
        'GET /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
      params: {
        path: { serviceName },
        query: {
          start,
          end,
          environment,
          kuery,
          transactionType,
          groupIds: JSON.stringify([errorEvent['error.grouping_key']]),
          numBuckets: 10,
        },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}',
      params: {
        path: { serviceName, groupId: errorEvent['error.grouping_key'] },
        query: { start, end, environment, kuery },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/errors/distribution',
      params: {
        path: { serviceName },
        query: { start, end, environment, kuery },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/infrastructure',
      params: {
        path: { serviceName },
        query: { start, end, environment, kuery },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/metadata/details',
      params: {
        path: { serviceName },
        query: { start, end },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/metadata/icons',
      params: {
        path: { serviceName },
        query: { start, end },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/metrics/charts',
      params: {
        path: { serviceName },
        query: { start, end, environment, kuery, agentName },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/serviceNodes',
      params: {
        path: { serviceName },
        query: { start, end, environment, kuery },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/throughput',
      params: {
        path: { serviceName },
        query: { start, end, environment, kuery, transactionType },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/{serviceName}/transaction_types',
      params: {
        path: { serviceName },
        query: { start, end },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/services/detailed_statistics',
      params: {
        query: {
          start,
          end,
          environment,
          kuery,
          serviceNames: JSON.stringify([serviceName]),
        },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/settings/anomaly-detection/environments',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/settings/anomaly-detection/jobs',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/settings/apm-index-settings',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/settings/apm-indices',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/settings/custom_links',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/settings/custom_links/transaction',
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/suggestions',
      params: {
        query: { field: 'service.name', string: '' },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/traces',
      params: {
        query: { start, end, environment, kuery },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/traces/{traceId}',
      params: {
        path: { traceId: transactionEvent['trace.id'] },
        query: { start, end },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/traces/{traceId}/root_transaction',
      params: {
        path: { traceId: transactionEvent['trace.id'] },
      },
    }),
    callApmApi({
      endpoint: 'GET /internal/apm/transactions/{transactionId}',
      params: {
        path: { transactionId: transactionEvent['transaction.id'] },
      },
    }),
  ];

  return Promise.all(promises);
}

async function getKibanaUrlWithBasePath(kibanaUrl: string) {
  try {
    await axios.request({ url: kibanaUrl, maxRedirects: 0 });
  } catch (e) {
    if (!e.isAxiosError) {
      throw e;
    }

    const axiosError = e as AxiosError;
    const location = axiosError.response?.headers?.location;
    const hasBasePath = RegExp(/^\/\w{3}$/).test(location);
    const basePath = hasBasePath ? location : '';
    return `${kibanaUrl}${basePath}`;
  }
  return kibanaUrl;
}
