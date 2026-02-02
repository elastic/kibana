/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import { getAgentName } from '@kbn/elastic-agent-utils';
import type { SortOptions } from '@elastic/elasticsearch/lib/api/types';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_REGION,
  CLOUD_MACHINE_TYPE,
  CLOUD_SERVICE_NAME,
  CONTAINER_ID,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SERVICE_VERSION,
  FAAS_ID,
  FAAS_TRIGGER_TYPE,
  AGENT_NAME,
  TELEMETRY_SDK_LANGUAGE,
  TELEMETRY_SDK_NAME,
  AGENT_VERSION,
  TELEMETRY_SDK_VERSION,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_FRAMEWORK_NAME,
  HOST_OS_PLATFORM,
  HOST_ARCHITECTURE,
  CLOUD_PROVIDER,
  CLOUD_PROJECT_NAME,
} from '../../../common/es_fields/apm';
import type { ContainerType } from '../../../common/service_metadata';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { should } from './get_service_metadata_icons';
import { isOpenTelemetryAgentName, hasOpenTelemetryPrefix } from '../../../common/agent_name';
import { maybe } from '../../../common/utils/maybe';

export interface ServiceMetadataDetails {
  service?: {
    versions?: string[];
    runtime?: {
      name?: string;
      version?: string;
    };
    framework?: string;
    agent: {
      name: string;
      version: string;
    };
  };
  opentelemetry?: {
    language?: string;
    sdkVersion?: string;
    autoVersion?: string;
  };
  container?: {
    ids?: string[];
    image?: string;
    os?: string;
    totalNumberInstances?: number;
  };
  serverless?: {
    type?: string;
    functionNames?: string[];
    faasTriggerTypes?: string[];
    hostArchitecture?: string;
  };
  cloud?: {
    provider?: string;
    availabilityZones?: string[];
    regions?: string[];
    machineTypes?: string[];
    projectName?: string;
    serviceName?: string;
  };
  kubernetes?: {
    deployments?: string[];
    namespaces?: string[];
    replicasets?: string[];
    containerImages?: string[];
  };
}

export async function getServiceMetadataDetails({
  serviceName,
  environment,
  apmEventClient,
  start,
  end,
}: {
  serviceName: string;
  environment: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<ServiceMetadataDetails> {
  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...environmentQuery(environment),
    ...rangeQuery(start, end),
  ];

  const params = {
    apm: {
      events: [ProcessorEvent.transaction, ProcessorEvent.error, ProcessorEvent.metric],
    },
    sort: [
      { _score: { order: 'desc' as const } },
      { '@timestamp': { order: 'desc' as const } },
    ] as SortOptions[],
    track_total_hits: 1,
    size: 1,
    query: { bool: { filter, should } },
    aggs: {
      serviceVersions: {
        terms: {
          field: SERVICE_VERSION,
          size: 10,
          order: { _key: 'desc' as const },
        },
      },
      availabilityZones: {
        terms: {
          field: CLOUD_AVAILABILITY_ZONE,
          size: 10,
        },
      },
      containerIds: {
        terms: {
          field: CONTAINER_ID,
          size: 10,
        },
      },
      regions: {
        terms: {
          field: CLOUD_REGION,
          size: 10,
        },
      },
      cloudServices: {
        terms: {
          field: CLOUD_SERVICE_NAME,
          size: 1,
        },
      },
      machineTypes: {
        terms: {
          field: CLOUD_MACHINE_TYPE,
          size: 10,
        },
      },
      faasTriggerTypes: {
        terms: {
          field: FAAS_TRIGGER_TYPE,
          size: 10,
        },
      },
      faasFunctionNames: {
        terms: {
          field: FAAS_ID,
          size: 10,
        },
      },
      totalNumberInstances: { cardinality: { field: SERVICE_NODE_NAME } },
    },
    fields: ['*'],
  };

  const data = await apmEventClient.search('get_service_metadata_details', params);

  if (data.hits.total.value === 0) {
    return {
      service: undefined,
      container: undefined,
      cloud: undefined,
    };
  }

  const hits = maybe(data.hits.hits[0])?.fields;

  const event = hits && accessKnownApmEventFields(hits as Partial<FlattenedApmEvent>);

  if (!event) {
    return {
      service: undefined,
      container: undefined,
      cloud: undefined,
    };
  }

  const aggregations = data.aggregations;
  const agentName = getAgentName(
    event[AGENT_NAME] ?? null,
    event[TELEMETRY_SDK_LANGUAGE] ?? null,
    event[TELEMETRY_SDK_NAME] ?? null
  ) as string;
  const agentVersion = (event[AGENT_VERSION] ?? event[TELEMETRY_SDK_VERSION]) as string;
  const runtimeName = event[SERVICE_RUNTIME_NAME];
  const runtimeVersion = event[SERVICE_RUNTIME_VERSION];

  const serviceMetadataDetails = {
    versions: aggregations?.serviceVersions.buckets.map((bucket) => bucket.key as string),
    runtime:
      runtimeName || runtimeVersion
        ? {
            name: runtimeName,
            version: runtimeVersion,
          }
        : undefined,
    framework: event[SERVICE_FRAMEWORK_NAME],
    agent: { name: agentName, version: agentVersion },
  };

  const otelDetails = isOpenTelemetryAgentName(agentName)
    ? {
        language: hasOpenTelemetryPrefix(agentName) ? agentName.split('/')[1] : undefined,
        sdkVersion: agentVersion,
        autoVersion: event['labels.telemetry_auto_version'] as string,
      }
    : undefined;

  const totalNumberInstances = aggregations?.totalNumberInstances.value;

  const kubernetes = event.containsFields('kubernetes');
  const container = event.containsFields('container');
  const hostOsPlatform = event[HOST_OS_PLATFORM];

  const containerDetails =
    hostOsPlatform || kubernetes || totalNumberInstances || container
      ? {
          type: (kubernetes ? 'Kubernetes' : 'Docker') as ContainerType,
          os: hostOsPlatform,
          totalNumberInstances,
          ids: aggregations?.containerIds.buckets.map((bucket) => bucket.key as string),
        }
      : undefined;

  const cloudServiceName = event[CLOUD_SERVICE_NAME];

  const serverlessDetails =
    !!aggregations?.faasTriggerTypes?.buckets.length && cloudServiceName
      ? {
          type: cloudServiceName,
          functionNames: aggregations?.faasFunctionNames.buckets
            .map((bucket) => getLambdaFunctionNameFromARN(bucket.key as string))
            .filter((name) => name),
          faasTriggerTypes: aggregations?.faasTriggerTypes.buckets.map(
            (bucket) => bucket.key as string
          ),
          hostArchitecture: event[HOST_ARCHITECTURE],
        }
      : undefined;

  const cloudDetails = cloudServiceName
    ? {
        provider: event[CLOUD_PROVIDER],
        projectName: event[CLOUD_PROJECT_NAME],
        serviceName: cloudServiceName,
        availabilityZones: aggregations?.availabilityZones.buckets.map(
          (bucket) => bucket.key as string
        ),
        regions: aggregations?.regions.buckets.map((bucket) => bucket.key as string),
        machineTypes: aggregations?.machineTypes.buckets.map((bucket) => bucket.key as string),
      }
    : undefined;

  return {
    service: serviceMetadataDetails,
    opentelemetry: otelDetails,
    container: containerDetails,
    serverless: serverlessDetails,
    cloud: cloudDetails,
  };
}

function getLambdaFunctionNameFromARN(arn: string) {
  // Lambda function ARN example: arn:aws:lambda:us-west-2:123456789012:function:my-function
  return arn.split(':')[6] || '';
}
