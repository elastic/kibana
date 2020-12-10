/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeFilter } from '../../../common/utils/range_filter';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { getBucketSize } from '../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

type ServiceDetails = Pick<
  TransactionRaw,
  'service' | 'agent' | 'host' | 'container' | 'kubernetes' | 'cloud'
>;

interface ServiceDetailsResponse {
  service?: {
    version?: string;
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
    avgNumberInstances?: number;
    orchestration?: 'Kubernetes' | 'Docker';
  };
  cloud?: {
    provider?: string;
    availabilityZones?: string[];
    machineTypes?: string[];
    projectName?: string;
  };
}

export async function getServiceDetails({
  serviceName,
  setup,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
}): Promise<ServiceDetailsResponse> {
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end });

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
    { range: rangeFilter(start, end) },
    ...setup.esFilter,
  ];

  const params = {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      size: 1,
      _source: [SERVICE, AGENT, HOST, CONTAINER, KUBERNETES, CLOUD],
      query: { bool: { filter } },
      aggs: {
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
        histogram: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            total_instances: { cardinality: { field: SERVICE_NODE_NAME } },
          },
        },
        avgNumberInstances: {
          avg_bucket: { buckets_path: 'histogram>total_instances' },
        },
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
    .hits[0]._source as ServiceDetails;

  const serviceDetails: ServiceDetailsResponse['service'] = {
    version: service.version,
    runtime: service.runtime,
    framework: service.framework?.name,
    agent,
  };

  const avgNumberInstances =
    response.aggregations?.avgNumberInstances.value || undefined;
  const containerDetails: ServiceDetailsResponse['container'] =
    host || container || avgNumberInstances || kubernetes
      ? {
          os: host?.os?.platform,
          orchestration: !!kubernetes ? 'Kubernetes' : 'Docker',
          isContainerized: !!container?.id,
          avgNumberInstances,
        }
      : undefined;

  const cloudDetails: ServiceDetailsResponse['cloud'] = cloud
    ? {
        provider: cloud.provider,
        projectName: cloud.project.name,
        availabilityZones: response.aggregations?.availabilityZones.buckets.map(
          (bucket) => bucket.key as string
        ),
        machineTypes: response.aggregations?.machineTypes.buckets.map(
          (bucket) => bucket.key as string
        ),
      }
    : undefined;

  return {
    service: serviceDetails,
    container: containerDetails,
    cloud: cloudDetails,
  };
}
