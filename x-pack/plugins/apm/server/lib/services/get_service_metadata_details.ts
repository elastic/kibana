/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SortOptions } from '../../../../../typings/elasticsearch';
import {
  AGENT,
  CLOUD,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_MACHINE_TYPE,
  CONTAINER,
  HOST,
  KUBERNETES,
  PROCESSOR_EVENT,
  SERVICE,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SERVICE_VERSION,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { ContainerType } from '../../../common/service_metadata';
import { rangeFilter } from '../../../common/utils/range_filter';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

type ServiceMetadataDetailsRaw = Pick<
  TransactionRaw,
  'service' | 'agent' | 'host' | 'container' | 'kubernetes' | 'cloud'
>;

interface ServiceMetadataDetails {
  service?: {
    versions?: string[];
    runtime?: {
      name: string;
      version: string;
    };
    framework?: string;
    agent: {
      name: string;
      version: string;
    };
  };
  container?: {
    os?: string;
    isContainerized?: boolean;
    totalNumberInstances?: number;
    type?: ContainerType;
  };
  cloud?: {
    provider?: string;
    availabilityZones?: string[];
    machineTypes?: string[];
    projectName?: string;
  };
}

export async function getServiceMetadataDetails({
  serviceName,
  setup,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
}): Promise<ServiceMetadataDetails> {
  const { start, end, apmEventClient } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
    { range: rangeFilter(start, end) },
    ...setup.esFilter,
  ];

  const should = [
    { exists: { field: CONTAINER } },
    { exists: { field: KUBERNETES } },
    { exists: { field: CLOUD } },
    { exists: { field: HOST } },
    { exists: { field: AGENT } },
  ];

  const params = {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      size: 1,
      _source: [SERVICE, AGENT, HOST, CONTAINER, KUBERNETES, CLOUD],
      query: { bool: { filter, should } },
      aggs: {
        serviceVersions: {
          terms: {
            field: SERVICE_VERSION,
            size: 10,
            order: { _key: 'desc' } as SortOptions,
          },
        },
        availabilityZones: {
          terms: {
            field: CLOUD_AVAILABILITY_ZONE,
            size: 10,
          },
        },
        machineTypes: {
          terms: {
            field: CLOUD_MACHINE_TYPE,
            size: 10,
          },
        },
        totalNumberInstances: { cardinality: { field: SERVICE_NODE_NAME } },
      },
    },
  };

  const response = await apmEventClient.search(params);

  if (response.hits.total.value === 0) {
    return {
      service: undefined,
      container: undefined,
      cloud: undefined,
    };
  }

  const { service, agent, host, kubernetes, container, cloud } = response.hits
    .hits[0]._source as ServiceMetadataDetailsRaw;

  const serviceMetadataDetails = {
    versions: response.aggregations?.serviceVersions.buckets.map(
      (bucket) => bucket.key as string
    ),
    runtime: service.runtime,
    framework: service.framework?.name,
    agent,
  };

  const totalNumberInstances =
    response.aggregations?.totalNumberInstances.value;

  const containerDetails =
    host || container || totalNumberInstances || kubernetes
      ? {
          os: host?.os?.platform,
          type: (!!kubernetes ? 'Kubernetes' : 'Docker') as ContainerType,
          isContainerized: !!container?.id,
          totalNumberInstances,
        }
      : undefined;

  const cloudDetails = cloud
    ? {
        provider: cloud.provider,
        projectName: cloud.project?.name,
        availabilityZones: response.aggregations?.availabilityZones.buckets.map(
          (bucket) => bucket.key as string
        ),
        machineTypes: response.aggregations?.machineTypes.buckets.map(
          (bucket) => bucket.key as string
        ),
      }
    : undefined;

  return {
    service: serviceMetadataDetails,
    container: containerDetails,
    cloud: cloudDetails,
  };
}
