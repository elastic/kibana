/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/unflatten_known_fields';
import { getAgentName } from '@kbn/elastic-agent-utils';
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
} from '../../../common/es_fields/apm';
import { ContainerType } from '../../../common/service_metadata';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { should } from './get_service_metadata_icons';
import { isOpenTelemetryAgentName, hasOpenTelemetryPrefix } from '../../../common/agent_name';
import { maybe } from '../../../common/utils/maybe';

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
    sort: [{ _score: { order: 'desc' as const } }, { '@timestamp': { order: 'desc' as const } }],
    body: {
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
    },
  };

  const data = await apmEventClient.search('get_service_metadata_details', params);

  if (data.hits.total.value === 0) {
    return {
      service: undefined,
      container: undefined,
      cloud: undefined,
    };
  }

  const response = structuredClone(data);
  response.hits.hits[0].fields[AGENT_NAME] = getAgentName(
    data.hits.hits[0]?.fields?.[AGENT_NAME] as unknown as string | null,
    data.hits.hits[0]?.fields?.[TELEMETRY_SDK_LANGUAGE] as unknown as string | null,
    data.hits.hits[0]?.fields?.[TELEMETRY_SDK_NAME] as unknown as string | null
  ) as unknown as unknown[];
  response.hits.hits[0].fields[AGENT_VERSION] =
    response.hits.hits[0].fields[AGENT_VERSION] ??
    data.hits.hits[0]?.fields?.[TELEMETRY_SDK_VERSION];

  const event = unflattenKnownApmEventFields(
    maybe(response.hits.hits[0])?.fields as undefined | FlattenedApmEvent
  );

  if (!event) {
    return {
      service: undefined,
      container: undefined,
      cloud: undefined,
    };
  }

  const { service, agent, host, kubernetes, container, cloud, labels } = event;

  const serviceMetadataDetails = {
    versions: response.aggregations?.serviceVersions.buckets.map((bucket) => bucket.key as string),
    runtime: service.runtime,
    framework: service.framework?.name,
    agent,
  };

  const otelDetails =
    Boolean(agent?.name) && isOpenTelemetryAgentName(agent.name)
      ? {
          language: hasOpenTelemetryPrefix(agent.name) ? agent.name.split('/')[1] : undefined,
          sdkVersion: agent?.version,
          autoVersion: labels?.telemetry_auto_version as string,
        }
      : undefined;

  const totalNumberInstances = response.aggregations?.totalNumberInstances.value;

  const containerDetails =
    host || container || totalNumberInstances || kubernetes
      ? {
          type: (!!kubernetes ? 'Kubernetes' : 'Docker') as ContainerType,
          os: host?.os?.platform,
          totalNumberInstances,
          ids: response.aggregations?.containerIds.buckets.map((bucket) => bucket.key as string),
        }
      : undefined;

  const serverlessDetails =
    !!response.aggregations?.faasTriggerTypes?.buckets.length && cloud
      ? {
          type: cloud.service?.name,
          functionNames: response.aggregations?.faasFunctionNames.buckets
            .map((bucket) => getLambdaFunctionNameFromARN(bucket.key as string))
            .filter((name) => name),
          faasTriggerTypes: response.aggregations?.faasTriggerTypes.buckets.map(
            (bucket) => bucket.key as string
          ),
          hostArchitecture: host?.architecture,
        }
      : undefined;

  const cloudDetails = cloud
    ? {
        provider: cloud.provider,
        projectName: cloud.project?.name,
        serviceName: cloud.service?.name,
        availabilityZones: response.aggregations?.availabilityZones.buckets.map(
          (bucket) => bucket.key as string
        ),
        regions: response.aggregations?.regions.buckets.map((bucket) => bucket.key as string),
        machineTypes: response.aggregations?.machineTypes.buckets.map(
          (bucket) => bucket.key as string
        ),
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
