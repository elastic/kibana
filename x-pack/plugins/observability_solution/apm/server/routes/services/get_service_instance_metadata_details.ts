/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { serviceInstanceMetadataDetailsMapping } from '../../utils/es_fields_mappings';
import {
  AGENT_ACTIVATION_METHOD,
  AGENT_NAME,
  AGENT_VERSION,
  AT_TIMESTAMP,
  CLOUD_ACCOUNT_ID,
  CLOUD_ACCOUNT_NAME,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_IMAGE_ID,
  CLOUD_INSTANCE_ID,
  CLOUD_INSTANCE_NAME,
  CLOUD_MACHINE_TYPE,
  CLOUD_PROJECT_ID,
  CLOUD_PROJECT_NAME,
  CLOUD_PROVIDER,
  CLOUD_REGION,
  CLOUD_SERVICE_NAME,
  CONTAINER_ID,
  CONTAINER_IMAGE,
  HOST_ARCHITECTURE,
  HOST_HOSTNAME,
  HOST_IP,
  HOST_NAME,
  HOST_OS_PLATFORM,
  KUBERNETES_NAMESPACE,
  KUBERNETES_NODE_NAME,
  KUBERNETES_POD_NAME,
  KUBERNETES_POD_UID,
  METRICSET_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_LANGUAGE_VERSION,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_VERSION,
} from '../../../common/es_fields/apm';
import { maybe } from '../../../common/utils/maybe';
import {
  getBackwardCompatibleDocumentTypeFilter,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { Agent } from '../../../typings/es_schemas/ui/fields/agent';
import { Service } from '../../../typings/es_schemas/raw/fields/service';
import { Container } from '../../../typings/es_schemas/raw/fields/container';
import { Kubernetes } from '../../../typings/es_schemas/raw/fields/kubernetes';
import { Host } from '../../../typings/es_schemas/raw/fields/host';
import { Cloud } from '../../../typings/es_schemas/raw/fields/cloud';

export interface ServiceInstanceMetadataDetailsResponse {
  '@timestamp': string;
  agent?: Agent;
  service?: Service;
  container?: Container;
  kubernetes?: Kubernetes;
  host?: Host;
  cloud?: Cloud;
}
const SERVICE_INSTANCE_METADATA_FIELDS = [
  AT_TIMESTAMP,
  AGENT_NAME,
  AGENT_VERSION,
  AGENT_ACTIVATION_METHOD,
  HOST_ARCHITECTURE,
  HOST_HOSTNAME,
  HOST_NAME,
  HOST_IP,
  HOST_OS_PLATFORM,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_LANGUAGE_VERSION,
  SERVICE_VERSION,
  KUBERNETES_NAMESPACE,
  KUBERNETES_NODE_NAME,
  KUBERNETES_POD_NAME,
  KUBERNETES_POD_UID,
  CLOUD_ACCOUNT_ID,
  CLOUD_ACCOUNT_NAME,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_IMAGE_ID,
  CLOUD_INSTANCE_ID,
  CLOUD_INSTANCE_NAME,
  CLOUD_MACHINE_TYPE,
  CLOUD_PROJECT_ID,
  CLOUD_PROJECT_NAME,
  CLOUD_PROVIDER,
  CLOUD_REGION,
  CLOUD_SERVICE_NAME,
  CONTAINER_ID,
  CONTAINER_IMAGE,
];

export async function getServiceInstanceMetadataDetails({
  serviceName,
  serviceNodeName,
  apmEventClient,
  start,
  end,
}: {
  serviceName: string;
  serviceNodeName: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<ServiceInstanceMetadataDetailsResponse> {
  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [SERVICE_NODE_NAME]: serviceNodeName } },
    ...rangeQuery(start, end),
  ];

  async function getApplicationMetricSample() {
    const response = await apmEventClient.search(
      'get_service_instance_metadata_details_application_metric',
      {
        apm: {
          events: [ProcessorEvent.metric],
        },
        body: {
          track_total_hits: false,
          terminate_after: 1,
          size: 1,
          query: {
            bool: {
              filter: filter.concat({ term: { [METRICSET_NAME]: 'app' } }),
            },
          },
          fields: SERVICE_INSTANCE_METADATA_FIELDS,
        },
      }
    );

    return maybe(serviceInstanceMetadataDetailsMapping(response.hits.hits[0]?.fields));
  }

  async function getTransactionEventSample() {
    const response = await apmEventClient.search(
      'get_service_instance_metadata_details_application_transaction_event',
      {
        apm: {
          events: [ProcessorEvent.transaction],
        },
        body: {
          track_total_hits: false,
          terminate_after: 1,
          size: 1,
          query: { bool: { filter } },
          fields: SERVICE_INSTANCE_METADATA_FIELDS,
        },
      }
    );

    return maybe(serviceInstanceMetadataDetailsMapping(response.hits.hits[0]?.fields));
  }

  async function getTransactionMetricSample() {
    const response = await apmEventClient.search(
      'get_service_instance_metadata_details_application_transaction_metric',
      {
        apm: {
          events: [getProcessorEventForTransactions(true)],
        },
        body: {
          track_total_hits: false,
          terminate_after: 1,
          size: 1,
          query: {
            bool: {
              filter: filter.concat(getBackwardCompatibleDocumentTypeFilter(true)),
            },
          },
          fields: SERVICE_INSTANCE_METADATA_FIELDS,
        },
      }
    );
    return maybe(serviceInstanceMetadataDetailsMapping(response.hits.hits[0]?.fields));
  }

  // we can expect the most detail of application metrics,
  // followed by transaction events, and then finally transaction metrics
  const [applicationMetricSample, transactionEventSample, transactionMetricSample] =
    await Promise.all([
      getApplicationMetricSample(),
      getTransactionEventSample(),
      getTransactionMetricSample(),
    ]);

  const sample = merge(
    {},
    transactionMetricSample,
    transactionEventSample,
    applicationMetricSample
  );

  const { agent, service, container, kubernetes, host, cloud } = sample;

  return {
    '@timestamp': sample['@timestamp'],
    agent,
    service,
    container,
    kubernetes,
    host,
    cloud,
  };
}
