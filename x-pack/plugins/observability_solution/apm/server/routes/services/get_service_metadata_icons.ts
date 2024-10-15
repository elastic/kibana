/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/unflatten_known_fields';
import { maybe } from '../../../common/utils/maybe';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  CLOUD_PROVIDER,
  CLOUD_SERVICE_NAME,
  CONTAINER_ID,
  SERVICE_NAME,
  KUBERNETES_POD_NAME,
  HOST_OS_PLATFORM,
  LABEL_TELEMETRY_AUTO_VERSION,
  AGENT_VERSION,
  SERVICE_FRAMEWORK_NAME,
} from '../../../common/es_fields/apm';
import { ContainerType, SERVICE_METADATA_KUBERNETES_KEYS } from '../../../common/service_metadata';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { ServerlessType, getServerlessTypeFromCloudData } from '../../../common/serverless';

export interface ServiceMetadataIcons {
  agentName?: string;
  containerType?: ContainerType;
  serverlessType?: ServerlessType;
  cloudProvider?: string;
}

export const should = [
  { exists: { field: CONTAINER_ID } },
  { exists: { field: KUBERNETES_POD_NAME } },
  { exists: { field: CLOUD_PROVIDER } },
  { exists: { field: HOST_OS_PLATFORM } },
  { exists: { field: AGENT_NAME } },
  { exists: { field: AGENT_VERSION } },
  { exists: { field: SERVICE_FRAMEWORK_NAME } },
  { exists: { field: LABEL_TELEMETRY_AUTO_VERSION } },
];

export async function getServiceMetadataIcons({
  serviceName,
  apmEventClient,
  searchAggregatedTransactions,
  start,
  end,
}: {
  serviceName: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}): Promise<ServiceMetadataIcons> {
  const filter = [{ term: { [SERVICE_NAME]: serviceName } }, ...rangeQuery(start, end)];

  const fields = asMutableArray([
    CLOUD_PROVIDER,
    CONTAINER_ID,
    AGENT_NAME,
    CLOUD_SERVICE_NAME,
    ...SERVICE_METADATA_KUBERNETES_KEYS,
  ] as const);

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      track_total_hits: 1,
      size: 1,
      query: { bool: { filter, should } },
      fields,
    },
  };

  const response = await apmEventClient.search('get_service_metadata_icons', params);

  if (response.hits.total.value === 0) {
    return {
      agentName: undefined,
      containerType: undefined,
      cloudProvider: undefined,
      serverlessType: undefined,
    };
  }

  const event = unflattenKnownApmEventFields(
    maybe(response.hits.hits[0])?.fields as undefined | FlattenedApmEvent
  );

  const { kubernetes, cloud, container, agent } = event ?? {};
  let containerType: ContainerType;
  if (!!kubernetes) {
    containerType = 'Kubernetes';
  } else if (!!container) {
    containerType = 'Docker';
  }

  const serverlessType = getServerlessTypeFromCloudData(cloud?.provider, cloud?.service?.name);

  return {
    agentName: agent?.name,
    containerType,
    serverlessType,
    cloudProvider: cloud?.provider,
  };
}
