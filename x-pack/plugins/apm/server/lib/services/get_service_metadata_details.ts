/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { SortOptions } from '../../../../../typings/elasticsearch';
import {
  AGENT,
  CLOUD,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_MACHINE_TYPE,
  CONTAINER_ID,
  HOST,
  KUBERNETES,
  SERVICE,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SERVICE_VERSION,
} from '../../../common/elasticsearch_fieldnames';
import { ContainerType } from '../../../common/service_metadata';
import { rangeQuery } from '../../../common/utils/queries';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { should } from './get_service_metadata_icons';
import { withApmSpan } from '../../utils/with_apm_span';

type ServiceMetadataDetailsRaw = Pick<
  TransactionRaw,
  'service' | 'agent' | 'host' | 'container' | 'kubernetes' | 'cloud'
>;

export interface ServiceMetadataDetails {
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

export function getServiceMetadataDetails({
  serviceName,
  setup,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}): Promise<ServiceMetadataDetails> {
  return withApmSpan('get_service_metadata_details', async () => {
    const { start, end, apmEventClient } = setup;

    const filter = [
      { term: { [SERVICE_NAME]: serviceName } },
      ...rangeQuery(start, end),
    ];

    const params = {
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
          ProcessorEvent.error,
          ProcessorEvent.metric,
        ],
      },
      body: {
        size: 1,
        _source: [SERVICE, AGENT, HOST, CONTAINER_ID, KUBERNETES, CLOUD],
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
  });
}
