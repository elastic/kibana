/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import {
  CLOUD_ACCOUNT_ID,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_INSTANCE_ID,
  CLOUD_INSTANCE_NAME,
  CLOUD_MACHINE_TYPE,
  CLOUD_PROVIDER,
  CONTAINER_ID,
  HOST_NAME,
  POD_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_VERSION,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { environmentQuery, kqlQuery, rangeQuery } from '../../utils/queries';
import { withApmSpan } from '../../utils/with_apm_span';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

export interface KeyValue {
  key: string;
  value: any | undefined;
}

interface ServiceInstanceMetadataDetails {
  service: {
    icon?: string;
    details: KeyValue[];
  };
  container: {
    icon?: 'Kubernetes' | 'Docker';
    details: KeyValue[];
  };
  cloud: {
    icon?: string;
    details: KeyValue[];
  };
}

export async function getServiceInstanceMetadataDetails({
  serviceName,
  serviceNodeName,
  setup,
  transactionType,
  environment,
  kuery,
}: {
  serviceName: string;
  serviceNodeName: string;
  setup: Setup & SetupTimeRange;
  transactionType: string;
  environment?: string;
  kuery?: string;
}): Promise<ServiceInstanceMetadataDetails> {
  return withApmSpan('get_service_instance_metadata_details', async () => {
    const { start, end, apmEventClient } = setup;
    const filter = [
      { term: { [SERVICE_NAME]: serviceName } },
      { term: { [SERVICE_NODE_NAME]: serviceNodeName } },
      { term: { [TRANSACTION_TYPE]: transactionType } },
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
      ...kqlQuery(kuery),
    ];

    const response = await apmEventClient.search({
      apm: {
        events: [ProcessorEvent.transaction],
      },
      body: {
        terminate_after: 1,
        size: 1,
        query: { bool: { filter } },
      },
    });

    const sample = response.hits.hits[0]?._source as TransactionRaw | undefined;

    if (!sample) {
      return {
        service: { details: [] },
        container: { details: [] },
        cloud: { details: [] },
      };
    }

    return {
      service: {
        icon: sample.agent.name,
        details: [
          { key: SERVICE_NODE_NAME, value: sample.service.node?.name },
          { key: SERVICE_VERSION, value: sample.service.version },
          { key: SERVICE_RUNTIME_NAME, value: sample.service.runtime?.name },
          {
            key: SERVICE_RUNTIME_VERSION,
            value: sample.service.runtime?.version,
          },
        ],
      },
      container: {
        icon: sample.kubernetes?.pod?.name ? 'Kubernetes' : 'Docker',
        details: [
          { key: CONTAINER_ID, value: sample.container?.id },
          { key: HOST_NAME, value: sample.host?.name },
          { key: POD_NAME, value: sample.kubernetes?.pod?.name },
        ],
      },
      cloud: {
        icon: sample.cloud?.provider,
        details: [
          { key: CLOUD_ACCOUNT_ID, value: sample.host?.name },
          {
            key: CLOUD_AVAILABILITY_ZONE,
            value: sample.cloud?.availability_zone,
          },
          { key: CLOUD_INSTANCE_ID, value: sample.cloud?.instance?.id },
          { key: CLOUD_INSTANCE_NAME, value: sample.cloud?.instance?.name },
          { key: CLOUD_MACHINE_TYPE, value: sample.cloud?.machine?.type },
          { key: CLOUD_PROVIDER, value: sample.cloud?.provider },
        ],
      },
    };
  });
}
