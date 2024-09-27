/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '@kbn/elastic-agent-utils';
import {
  APMError,
  Span,
  SpanLink,
  AGENT_NAME,
  AGENT_VERSION,
  AT_TIMESTAMP,
  CHILD_ID,
  DATA_STEAM_TYPE,
  DATA_STREAM_DATASET,
  DATA_STREAM_NAMESPACE,
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_TYPE,
  EVENT_OUTCOME,
  EVENT_SUCCESS_COUNT,
  FAAS_COLDSTART,
  LABEL_SOME_RESOURCE_ATTRIBUTE,
  OBSERVER_HOSTNAME,
  OBSERVER_TYPE,
  OBSERVER_VERSION,
  OBSERVER_VERSION_MAJOR,
  PARENT_ID,
  PROCESSOR_NAME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SPAN_ACTION,
  SPAN_COMPOSITE_COMPRESSION_STRATEGY,
  SPAN_COMPOSITE_COUNT,
  SPAN_COMPOSITE_SUM,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_LINKS_SPAN_ID,
  SPAN_LINKS_TRACE_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_SYNC,
  SPAN_TYPE,
  TIMESTAMP,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_REPRESENTATIVE_COUNT,
  TRANSACTION_RESULT,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
  ERROR_EXC_MESSAGE,
  ERROR_EXCEPTION,
  ERROR_GROUP_ID,
  ERROR_ID,
  ERROR_LOG_MESSAGE,
  HOST_NAME,
  CONTAINER_ID,
  CONTAINER_IMAGE,
  CLOUD_PROVIDER,
  CLOUD_INSTANCE_NAME,
  AGENT_ACTIVATION_METHOD,
  HOST_ARCHITECTURE,
  HOST_HOSTNAME,
  HOST_IP,
  HOST_OS_PLATFORM,
  HTTP_RESPONSE_STATUS_CODE,
  KUBERNETES_NAMESPACE,
  KUBERNETES_NODE_NAME,
  KUBERNETES_POD_NAME,
  KUBERNETES_POD_UID,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_VERSION,
  SERVICE_TARGET_NAME,
  SERVICE_TARGET_TYPE,
  SPAN_REPRESENTATIVE_COUNT,
  SERVICE_LANGUAGE_VERSION,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_INSTANCE_ID,
  CLOUD_MACHINE_TYPE,
  CLOUD_PROJECT_ID,
  CLOUD_PROJECT_NAME,
  CLOUD_REGION,
  CLOUD_ACCOUNT_ID,
  CLOUD_ACCOUNT_NAME,
  CLOUD_IMAGE_ID,
} from '@kbn/apm-types';
import {
  KUBERNETES_CONTAINER_NAME,
  KUBERNETES_DEPLOYMENT_NAME,
  KUBERNETES_REPLICASET_NAME,
  KUBERNETES_CONTAINER_ID,
} from '../../common/es_fields/infra_metrics';
import { Transaction } from '../../typings/es_schemas/ui/transaction';
import { TransactionRaw } from '../../typings/es_schemas/raw/transaction_raw';
import {
  WaterfallError,
  WaterfallSpan,
  WaterfallTransaction,
} from '../../common/waterfall/typings';
import { EventOutcome } from '../../common/event_outcome';
import { Exception } from '../../typings/es_schemas/raw/error_raw';

type ServiceMetadataIconsRaw = Pick<TransactionRaw, 'kubernetes' | 'cloud' | 'container' | 'agent'>;
type ServiceMetadataDetailsRaw = Pick<
  TransactionRaw,
  'service' | 'agent' | 'host' | 'container' | 'kubernetes' | 'cloud' | 'labels'
>;
const normalizeValue = <T>(field: unknown[] | unknown): T => {
  return (Array.isArray(field) && field.length > 0 ? field[0] : field) as T;
};

export const metadataForDependencyMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    span: {
      type: normalizeValue<string>(fields[SPAN_TYPE]),
      subtype: normalizeValue<string>(fields[SPAN_SUBTYPE]),
    },
  };
};

export const transactionsForDependencySpansMapping = (
  fields: Partial<Record<string, unknown[]>>
) => {
  if (!fields) return undefined;

  return {
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
      name: normalizeValue<string>(fields[TRANSACTION_NAME]),
      type: normalizeValue<string>(fields[TRANSACTION_TYPE]),
    },
  };
};

export const topDependencySpansMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
    },
    span: {
      id: normalizeValue<string>(fields[SPAN_ID]),
      name: normalizeValue<string>(fields[SPAN_NAME]),
      duration: {
        us: normalizeValue<number>(fields[SPAN_DURATION]),
      },
    },
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
    },
    event: {
      outcome: normalizeValue<EventOutcome>(fields[EVENT_OUTCOME]),
    },
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
  };
};

export const spanMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    parent: {
      id: normalizeValue<string>(fields[PARENT_ID]),
    },
    observer: {
      type: normalizeValue<string>(fields[OBSERVER_TYPE]),
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
      version_major: normalizeValue<number>(fields[OBSERVER_VERSION_MAJOR]),
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: normalizeValue<string>(fields[AGENT_VERSION]),
    },
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
      framework: {
        name: normalizeValue<string>(fields[SERVICE_FRAMEWORK_NAME]),
        version: normalizeValue<string>(fields[SERVICE_FRAMEWORK_VERSION]),
      },
      target: {
        name: normalizeValue<string>(fields[SERVICE_TARGET_NAME]),
        type: normalizeValue<string>(fields[SERVICE_TARGET_TYPE]),
      },
    },
    event: {
      outcome: normalizeValue<EventOutcome>(fields[EVENT_OUTCOME]),
      success_count: normalizeValue<number>(fields[EVENT_SUCCESS_COUNT]),
    },
    processor: {
      name: normalizeValue<'transaction'>(fields[PROCESSOR_NAME]),
      event: normalizeValue<'span'>(fields[PROCESSOR_EVENT]),
    },
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
    },
    span: {
      duration: {
        us: normalizeValue<number>(fields[SPAN_DURATION]),
      },
      subtype: normalizeValue<string>(fields[SPAN_SUBTYPE]),
      name: normalizeValue<string>(fields[SPAN_NAME]),
      destination: {
        service: {
          resource: normalizeValue<string>(fields[SPAN_DESTINATION_SERVICE_RESOURCE]),
        },
      },
      id: normalizeValue<string>(fields[SPAN_ID]),
      type: normalizeValue<string>(fields[SPAN_TYPE]),
      representative_count: normalizeValue<number>(fields[SPAN_REPRESENTATIVE_COUNT]),
    },
    timestamp: {
      us: normalizeValue<number>(fields[TIMESTAMP]),
    },
    http: {
      response: {
        status_code: normalizeValue<number>(fields[HTTP_RESPONSE_STATUS_CODE]),
      },
    },
    data_stream: {
      namespace: normalizeValue<string>(fields[DATA_STREAM_NAMESPACE]),
      type: normalizeValue<string>(fields[DATA_STEAM_TYPE]),
      dataset: normalizeValue<string>(fields[DATA_STREAM_DATASET]),
    },
  };
};

export const spanLinksDetailsMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    span: {
      id: normalizeValue<string>(fields[SPAN_ID]),
      name: normalizeValue<string>(fields[SPAN_NAME]),
      type: normalizeValue<string>(fields[SPAN_TYPE]),
      subtype: normalizeValue<string>(fields[SPAN_SUBTYPE]),
      duration: {
        us: normalizeValue<number>(fields[SPAN_DURATION]),
      },
    },
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
      name: normalizeValue<string>(fields[TRANSACTION_NAME]),
      duration: {
        us: normalizeValue<string>(fields[TRANSACTION_DURATION]),
      },
    },
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
    },
    processor: {
      event: normalizeValue<string>(fields[PROCESSOR_EVENT]),
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
    },
  };
};

// todo: pending #192337
export const linkedParentsOfSpanMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return (fields[SPAN_LINKS_TRACE_ID] as string[]).map((v, index) => {
    return {
      trace: {
        id: v,
      },
      span: {
        id: fields[SPAN_LINKS_SPAN_ID]?.[index] ?? '',
      },
    };
  }) as SpanLink[];
};

export const transactionMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    transaction: {
      representative_count: normalizeValue<number>(fields[TRANSACTION_REPRESENTATIVE_COUNT]),
      result: normalizeValue<string>(fields[TRANSACTION_RESULT]),
      sampled: normalizeValue<boolean>(fields[TRANSACTION_SAMPLED]),
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
      duration: {
        us: normalizeValue<number>(fields[TRANSACTION_DURATION]),
      },
      type: normalizeValue<string>(fields[TRANSACTION_TYPE]),
      name: normalizeValue<string>(fields[TRANSACTION_NAME]),
    },
    service: {
      node: {
        name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
      },
      language: {
        name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
      },
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      framework: {
        name: normalizeValue<string>(fields[SERVICE_FRAMEWORK_NAME]),
      },
    },
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: normalizeValue<string>(fields[AGENT_VERSION]),
    },
    event: {
      success_count: normalizeValue<boolean>(fields[EVENT_SUCCESS_COUNT]),
      outcome: normalizeValue<EventOutcome>(fields[EVENT_OUTCOME]),
    },
    processor: {
      event: normalizeValue<'transaction'>(fields[PROCESSOR_EVENT]),
      name: normalizeValue<'transaction'>(fields[PROCESSOR_NAME]),
    },
    data_stream: {
      namespace: normalizeValue<string>(fields[DATA_STREAM_NAMESPACE]),
      type: normalizeValue<string>(fields[DATA_STEAM_TYPE]),
      dataset: normalizeValue<string>(fields[DATA_STREAM_DATASET]),
    },
    span: {
      id: normalizeValue<string>(fields[SPAN_ID]),
      links: linkedParentsOfSpanMapping(fields),
    },
    observer: {
      hostname: normalizeValue<string>(fields[OBSERVER_HOSTNAME]),
      type: normalizeValue<string>(fields[OBSERVER_TYPE]),
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
      version_major: normalizeValue<number>(fields[OBSERVER_VERSION_MAJOR]),
    },
    timestamp: {
      us: normalizeValue<number>(fields[TIMESTAMP]),
    },
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    labels: {
      some_resource_attribute: normalizeValue<string>(fields[LABEL_SOME_RESOURCE_ATTRIBUTE]),
    },
  };
};

export const traceDocMapping = (
  fields: Partial<Record<string, unknown[]>>
): WaterfallTransaction | WaterfallSpan | undefined => {
  if (!fields) return undefined;

  return {
    timestamp: {
      us: normalizeValue<number>(fields[TIMESTAMP]),
    },
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    parent: {
      id: normalizeValue<string>(fields[PARENT_ID]),
    },
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
    },
    event: {
      outcome: normalizeValue<EventOutcome>(fields[EVENT_OUTCOME]),
    },
    processor: {
      event: normalizeValue<'span'>(fields[PROCESSOR_EVENT]),
    },
    transaction: {
      result: normalizeValue<string>(fields[TRANSACTION_RESULT]),
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
      duration: {
        us: normalizeValue<number>(fields[TRANSACTION_DURATION]),
      },
      type: normalizeValue<string>(fields[TRANSACTION_TYPE]),
      name: normalizeValue<string>(fields[TRANSACTION_NAME]),
    },
    faas: {
      coldstart: normalizeValue<boolean>(fields[FAAS_COLDSTART]),
    },
    span: {
      id: normalizeValue<string>(fields[SPAN_ID]),
      name: normalizeValue<string>(fields[SPAN_NAME]),
      type: normalizeValue<string>(fields[SPAN_TYPE]),
      subtype: normalizeValue<string>(fields[SPAN_SUBTYPE]),
      duration: {
        us: normalizeValue<number>(fields[SPAN_DURATION]),
      },
      action: normalizeValue<string>(fields[SPAN_ACTION]),
      links: linkedParentsOfSpanMapping(fields) as SpanLink[],
      composite: {
        count: normalizeValue<number>(fields[SPAN_COMPOSITE_COUNT]),
        sum: {
          us: normalizeValue<number>(fields[SPAN_COMPOSITE_SUM]),
        },
        compression_strategy: normalizeValue<string>(fields[SPAN_COMPOSITE_COMPRESSION_STRATEGY]),
      },
      sync: normalizeValue<boolean>(fields[SPAN_SYNC]),
    },
    child: {
      id: normalizeValue<string[]>(fields[CHILD_ID]),
    },
  };
};

export const errorDocsMapping = (
  fields: Partial<Record<string, unknown[]>>
): WaterfallError | undefined => {
  if (!fields) return undefined;

  return {
    timestamp: {
      us: normalizeValue<number>(fields[TIMESTAMP]),
    },
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
    },
    parent: {
      id: normalizeValue<string>(fields[PARENT_ID]),
    },
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
    },
    error: {
      id: normalizeValue<string>(fields[ERROR_ID]),
      log: {
        message: normalizeValue<string>(fields[ERROR_LOG_MESSAGE]),
      },
      exception: normalizeValue<Exception[]>(fields[ERROR_EXCEPTION]),
      grouping_key: normalizeValue<string>(fields[ERROR_GROUP_ID]),
    },
  };
};

export const errorGroupMainStatisticsMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    error: {
      id: normalizeValue<string>(fields[ERROR_ID]),
      log: {
        message: normalizeValue<string>(fields[ERROR_LOG_MESSAGE]),
      },
      exception: [
        {
          message: normalizeValue<string>(fields[ERROR_EXC_MESSAGE]),
          handled: normalizeValue<boolean>(fields[ERROR_EXC_HANDLED]),
          type: normalizeValue<string>(fields[ERROR_EXC_TYPE]),
        },
      ],
      culprit: normalizeValue<string>(fields[ERROR_CULPRIT]),
      grouping_key: normalizeValue<string>(fields[ERROR_GROUP_ID]),
    },
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
  };
};

export const errorSampleDetailsMapping = (
  fields: Partial<Record<string, unknown[]>>
): APMError | undefined => {
  if (!fields) return undefined;

  return {
    observer: {
      type: normalizeValue<string>(fields[OBSERVER_TYPE]),
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
      version_major: normalizeValue<number>(fields[OBSERVER_VERSION_MAJOR]),
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: '',
    },
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    service: {
      node: {
        name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
      },
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
    },
    host: {
      name: normalizeValue<string>(fields[HOST_NAME]),
    },
    error: {
      id: normalizeValue<string>(fields[ERROR_ID]),
      exception: [
        {
          message: normalizeValue<string>(fields[ERROR_EXC_MESSAGE]),
          type: normalizeValue<string>(fields[ERROR_EXC_TYPE]),
        },
      ],
      grouping_key: normalizeValue<string>(fields[ERROR_GROUP_ID]),
    },
    processor: {
      name: normalizeValue<'error'>(fields[PROCESSOR_NAME]),
      event: normalizeValue<'error'>(fields[PROCESSOR_EVENT]),
    },
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
      type: normalizeValue<string>(fields[TRANSACTION_TYPE]),
      sampled: normalizeValue<boolean>(fields[TRANSACTION_SAMPLED]),
    },
    timestamp: {
      us: normalizeValue<number>(fields[TIMESTAMP]),
    },
  };
};

export const serviceMetadataDetailsMapping = (
  fields: Partial<Record<string, unknown[]>>
): ServiceMetadataDetailsRaw | undefined => {
  if (!fields) return undefined;
  const kubernetesNamespace = normalizeValue<string>(fields[KUBERNETES_NAMESPACE]);
  const containerId = normalizeValue<string>(fields[CONTAINER_ID]);
  const cloudServiceName = normalizeValue<string>(fields[CLOUD_PROVIDER]);
  return {
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      version: normalizeValue<string>(fields[SERVICE_VERSION]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
      framework: {
        name: normalizeValue<string>(fields[SERVICE_FRAMEWORK_NAME]),
        version: normalizeValue<string>(fields[SERVICE_FRAMEWORK_VERSION]),
      },
      node: {
        name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
      },
      runtime: {
        name: normalizeValue<string>(fields[SERVICE_RUNTIME_NAME]),
        version: normalizeValue<string>(fields[SERVICE_RUNTIME_VERSION]),
      },
      language: {
        name: normalizeValue<string>(fields[SERVICE_LANGUAGE_NAME]),
        version: normalizeValue<string>(fields[SERVICE_LANGUAGE_VERSION]),
      },
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: normalizeValue<AgentName>(fields[AGENT_VERSION]),
    },
    host: {
      architecture: normalizeValue<string>(fields[HOST_ARCHITECTURE]),
      hostname: normalizeValue<string>(fields[HOST_HOSTNAME]),
      name: normalizeValue<string>(fields[HOST_NAME]),
      ip: normalizeValue<string>(fields[HOST_IP]),
      os: {
        platform: normalizeValue<string>(fields[HOST_OS_PLATFORM]),
      },
    },
    ...(containerId
      ? {
          container: {
            id: containerId,
            image: normalizeValue<string>(fields[CONTAINER_IMAGE]),
          },
        }
      : undefined),
    ...(kubernetesNamespace
      ? {
          kubernetes: {
            pod: {
              name: normalizeValue<string>(fields[KUBERNETES_POD_NAME]),
              uid: normalizeValue<string>(fields[KUBERNETES_POD_UID]),
            },
            namespace: kubernetesNamespace,
            replicaset: {
              name: normalizeValue<string>(fields[KUBERNETES_REPLICASET_NAME]),
            },
            deployment: {
              name: normalizeValue<string>(fields[KUBERNETES_DEPLOYMENT_NAME]),
            },
            container: {
              id: normalizeValue<string>(fields[KUBERNETES_CONTAINER_ID]),
              name: normalizeValue<string>(fields[KUBERNETES_CONTAINER_NAME]),
            },
          },
        }
      : undefined),
    ...(cloudServiceName
      ? {
          cloud: {
            availability_zone: normalizeValue<string>(fields[CLOUD_AVAILABILITY_ZONE]),
            instance: {
              name: normalizeValue<string>(fields[CLOUD_INSTANCE_NAME]),
              id: normalizeValue<string>(fields[CLOUD_INSTANCE_ID]),
            },
            machine: {
              type: normalizeValue<string>(fields[CLOUD_MACHINE_TYPE]),
            },
            project: {
              id: normalizeValue<string>(fields[CLOUD_PROJECT_ID]),
              name: normalizeValue<string>(fields[CLOUD_PROJECT_NAME]),
            },
            provider: normalizeValue<string>(fields[CLOUD_PROVIDER]),
            region: normalizeValue<string>(fields[CLOUD_REGION]),
            account: {
              id: normalizeValue<string>(fields[CLOUD_ACCOUNT_ID]),
              name: normalizeValue<string>(fields[CLOUD_ACCOUNT_NAME]),
            },
            image: {
              id: normalizeValue<string>(fields[CLOUD_IMAGE_ID]),
            },
            service: {
              name: normalizeValue<string>(fields[CLOUD_PROVIDER]),
            },
          },
        }
      : undefined),
  };
};

export const serviceMetadataIconsMapping = (
  fields: Partial<Record<string, unknown[]>>
): ServiceMetadataIconsRaw | undefined => {
  if (!fields) return undefined;
  const kubernetesNamespace = normalizeValue<string>(fields[KUBERNETES_NAMESPACE]);
  const containerId = normalizeValue<string>(fields[CONTAINER_ID]);
  const cloudServiceName = normalizeValue<string>(fields[CLOUD_PROVIDER]);
  return {
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: '',
    },
    ...(cloudServiceName
      ? {
          cloud: {
            provider: normalizeValue<string>(fields[CLOUD_PROVIDER]),
            service: {
              name: normalizeValue<string>(fields[CLOUD_PROVIDER]),
            },
          },
        }
      : undefined),
    ...(containerId
      ? {
          container: {
            id: containerId,
            image: normalizeValue<string>(fields[CONTAINER_IMAGE]),
          },
        }
      : undefined),
    ...(kubernetesNamespace
      ? {
          kubernetes: {
            pod: {
              name: normalizeValue<string>(fields[KUBERNETES_POD_NAME]),
              uid: normalizeValue<string>(fields[KUBERNETES_POD_UID]),
            },
            namespace: kubernetesNamespace,
            replicaset: {
              name: normalizeValue<string>(fields[KUBERNETES_REPLICASET_NAME]),
            },
            deployment: {
              name: normalizeValue<string>(fields[KUBERNETES_DEPLOYMENT_NAME]),
            },
            container: {
              id: normalizeValue<string>(fields[KUBERNETES_CONTAINER_ID]),
              name: normalizeValue<string>(fields[KUBERNETES_CONTAINER_NAME]),
            },
          },
        }
      : undefined),
  };
};

// todo(milosz): test it
export const serviceVersionMapping = (
  fields: Partial<Record<string, unknown[]>>
): Pick<Transaction | Span | APMError, 'observer'> | undefined => {
  if (!fields) return undefined;

  return {
    observer: {
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
      version_major: normalizeValue<number>(fields[OBSERVER_VERSION_MAJOR]),
    },
  };
};

export const metadataAppMetricMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: normalizeValue<string>(fields[AGENT_VERSION]),
      activation_method: normalizeValue<string>(fields[AGENT_ACTIVATION_METHOD]),
    },
    host: {
      architecture: normalizeValue<string>(fields[HOST_ARCHITECTURE]),
      hostname: normalizeValue<string>(fields[HOST_HOSTNAME]),
      ip: normalizeValue<string>(fields[HOST_IP]),
      name: normalizeValue<string>(fields[HOST_NAME]),
      os: {
        platform: normalizeValue<string>(fields[HOST_OS_PLATFORM]),
      },
    },
    kubernetes: {
      namespace: normalizeValue<string>(fields[KUBERNETES_NAMESPACE]),
      node: {
        name: normalizeValue<string>(fields[KUBERNETES_NODE_NAME]),
      },
      pod: {
        name: normalizeValue<string>(fields[KUBERNETES_POD_NAME]),
        uid: normalizeValue<string>(fields[KUBERNETES_POD_UID]),
      },
    },
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
      framework: {
        name: normalizeValue<string>(fields[SERVICE_FRAMEWORK_NAME]),
        versions: normalizeValue<string>(fields[SERVICE_FRAMEWORK_VERSION]),
      },
      language: {
        name: normalizeValue<string>(fields[SERVICE_LANGUAGE_NAME]),
      },
      node: {
        name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
      },
      runtime: {
        name: normalizeValue<string>(fields[SERVICE_RUNTIME_NAME]),
        version: normalizeValue<string>(fields[SERVICE_RUNTIME_VERSION]),
      },
      version: normalizeValue<string>(fields[SERVICE_VERSION]),
    },
  };
};

export const metadataAppTransactionEventMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    kubernetes: {
      namespace: normalizeValue<string>(fields[KUBERNETES_NAMESPACE]),
      node: {
        name: normalizeValue<string>(fields[KUBERNETES_NODE_NAME]),
      },
      pod: {
        name: normalizeValue<string>(fields[KUBERNETES_POD_NAME]),
        uid: normalizeValue<string>(fields[KUBERNETES_POD_UID]),
      },
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: normalizeValue<string>(fields[AGENT_VERSION]),
      activation_method: normalizeValue<string>(fields[AGENT_ACTIVATION_METHOD]),
    },
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
      framework: {
        name: normalizeValue<string>(fields[SERVICE_FRAMEWORK_NAME]),
        versions: normalizeValue<string>(fields[SERVICE_FRAMEWORK_VERSION]),
      },
      language: {
        name: normalizeValue<string>(fields[SERVICE_LANGUAGE_NAME]),
      },
      node: {
        name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
      },
      runtime: {
        name: normalizeValue<string>(fields[SERVICE_RUNTIME_NAME]),
        version: normalizeValue<string>(fields[SERVICE_RUNTIME_VERSION]),
      },
      version: normalizeValue<string>(fields[SERVICE_VERSION]),
    },
    host: {
      architecture: normalizeValue<string>(fields[HOST_ARCHITECTURE]),
      hostname: normalizeValue<string>(fields[HOST_HOSTNAME]),
      ip: fields[HOST_IP] as string[] | undefined,
      name: normalizeValue<string>(fields[HOST_NAME]),
      os: {
        platform: normalizeValue<string>(fields[HOST_OS_PLATFORM]),
      },
    },
  };
};

export const metaDataAppTransactionMetricMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
    },
    host: {
      hostname: normalizeValue<string>(fields[HOST_HOSTNAME]),
      name: normalizeValue<string>(fields[HOST_NAME]),
      os: {
        platform: normalizeValue<string>(fields[HOST_OS_PLATFORM]),
      },
    },
    kubernetes: {
      pod: {
        name: normalizeValue<string>(fields[KUBERNETES_POD_NAME]),
      },
    },
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
      language: {
        name: normalizeValue<string>(fields[SERVICE_LANGUAGE_NAME]),
      },
      node: {
        name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
      },
      runtime: {
        name: normalizeValue<string>(fields[SERVICE_RUNTIME_NAME]),
        version: normalizeValue<string>(fields[SERVICE_RUNTIME_VERSION]),
      },
      version: normalizeValue<string>(fields[SERVICE_VERSION]),
    },
  };
};

// todo: missing cloud and service properties
export const serviceAgentNameMapping = (fields: Partial<Record<string, unknown[]>>) => {
  if (!fields) return undefined;

  return {
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
    },
  };
};
