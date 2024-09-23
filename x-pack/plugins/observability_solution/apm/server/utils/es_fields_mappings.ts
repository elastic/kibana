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
  PROCESOR_NAME,
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
  SPAN_LINKS,
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
  Container,
  Kubernetes,
  CLOUD_PROVIDER,
  CONTAINER,
  KUBERNETES,
  AGENT_ACTIVATION_METHOD,
  CLIENT_IP,
  DOC_COUNT,
  EVENT_SUCCESS_COUNT_SUM,
  EVENT_SUCCESS_COUNT_VALUE_COUNT,
  HOST_ARCHITECTURE,
  HOST_HOSTNAME,
  HOST_IP,
  HOST_OS_PLATFORM,
  HTTP_REQUEST_HEADERS_ACCEPT,
  HTTP_REQUEST_HEADERS_CONNECTION,
  HTTP_REQUEST_HEADERS_ELASTIC_APM_TRACEPARENT,
  HTTP_REQUEST_HEADERS_HOST,
  HTTP_REQUEST_HEADERS_TRACEPARENT,
  HTTP_REQUEST_HEADERS_TRACESTATE,
  HTTP_REQUEST_HEADERS_USER_AGENT,
  HTTP_REQUEST_METHOD,
  HTTP_RESPONSE_HEADERS_CONNECTION,
  HTTP_RESPONSE_HEADERS_DATE,
  HTTP_RESPONSE_HEADERS_TRANSFER_ENCODING,
  HTTP_RESPONSE_HEADERS_X_POWERED_BY,
  HTTP_RESPONSE_STATUS_CODE,
  HTTP_VERSION,
  KUBERNETES_NAMESPACE,
  KUBERNETES_NODE_NAME,
  KUBERNETES_POD_NAME,
  KUBERNETES_POD_UID,
  LABEL_ENV,
  LABEL_HOSTNAME,
  METRIC_PROCESS_CPU_SYSTEM_NORM_PCT,
  METRIC_PROCESS_CPU_TOTAL_NORM_PCT,
  METRIC_PROCESS_CPU_TOTAL_USER_PCT,
  METRIC_PROCESS_MEMORY_RSS_BYTES,
  METRIC_PROCESS_MEMORY_SIZE,
  METRIC_SYSTEM_CPU_PERCENT,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  METRICSET_INTERVAL,
  METRICSET_NAME,
  NODEJS_EVENTLOOP_DELAY_AVG_MS,
  NODEJS_HANDLES_ACTIVE,
  NODEJS_MEMORY_ARRAYBUFFERS_BYTES,
  NODEJS_MEMORY_EXTERNAL_BYTES,
  NODEJS_MEMORY_HEAP_ALLOCATED_BYTES,
  NODEJS_MEMORY_HEAP_USED_BYTES,
  NODEJS_REQUESTS_ACTIVE,
  PROCESS_ARGS,
  PROCESS_PARENT_PID,
  PROCESS_PID,
  PROCESS_TITLE,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_VERSION,
  SOURCE_IP,
  TRANSACTION_DURATION_HISTOGRAM_VALUES,
  TRANSACTION_DURATION_SUMMARY_SUM,
  TRANSACTION_DURATION_SUMMARY_VALUE_COUNT,
  TRANSACTION_SPAN_COUNT_STARTED,
  URL_DOMAIN,
  URL_ORIGINAL,
  URL_PATH,
  URL_PORT,
  URL_SCHEME,
  USER_AGENT_DEVICE_NAME,
  USER_AGENT_NAME,
  USER_AGENT_ORIGINAL,
  USER_AGENT_VERSION,
} from '@kbn/apm-types';
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

const normalizeValue = <T>(field: unknown[] | unknown): T => {
  return (Array.isArray(field) && field.length > 0 ? field[0] : field) as T;
};

export const metadataForDependencyMapping = (fields: Partial<Record<string, unknown[]>>) => {
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
  return {
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
      name: normalizeValue<string>(fields[TRANSACTION_NAME]),
      type: normalizeValue<string>(fields[TRANSACTION_TYPE]),
    },
  };
};

export const topDependencySpansMapping = (fields: Partial<Record<string, unknown[]>>) => {
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

// todo(milosz): test with otel APM POC, mapping format wasn't confirmed with `fields`
export const spanMapping = (fields: Partial<Record<string, unknown[]>>): Span => {
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
    },
    event: {
      outcome: normalizeValue<EventOutcome>(fields[EVENT_OUTCOME]),
    },
    processor: {
      name: normalizeValue<'transaction'>(fields[PROCESOR_NAME]),
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
    },
    timestamp: {
      us: normalizeValue<number>(fields[TIMESTAMP]),
    },
  };
};

export const spanLinksDetailsMapping = (fields: Partial<Record<string, unknown[]>>) => {
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

export const linkedParentsOfSpanMapping = (fields: Partial<Record<string, unknown[]>>) => {
  return {
    span: {
      links: [
        {
          trace: {
            // todo(milosz): confirm `span.links.trace.id` format
            id: normalizeValue<string>(fields[SPAN_LINKS_TRACE_ID]),
          },
          span: {
            // todo(milosz): confirm `span.links.span.id` format
            id: normalizeValue<string>(fields[SPAN_LINKS_SPAN_ID]),
          },
        },
      ],
    },
  };
};

export const transactionMapping = (fields: Partial<Record<string, unknown[]>>) => {
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
      event: normalizeValue<string>(fields[PROCESSOR_EVENT]),
    },
    data_stream: {
      namespace: normalizeValue<string>(fields[DATA_STREAM_NAMESPACE]),
      type: normalizeValue<string>(fields[DATA_STEAM_TYPE]),
      dataset: normalizeValue<string>(fields[DATA_STREAM_DATASET]),
    },
    span: {
      id: normalizeValue<string>(fields[SPAN_ID]),
    },
    observer: {
      hostname: normalizeValue<string>(fields[OBSERVER_HOSTNAME]),
      type: normalizeValue<string>(fields[OBSERVER_TYPE]),
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
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
): WaterfallTransaction | WaterfallSpan => {
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
      links: normalizeValue<SpanLink[]>(fields[SPAN_LINKS]),
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

export const errorDocsMapping = (fields: Partial<Record<string, unknown[]>>): WaterfallError => {
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

export const errorSampleDetails = (fields: Partial<Record<string, unknown[]>>): APMError => {
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
      name: normalizeValue<'error'>(fields[PROCESOR_NAME]),
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

export const serviceMetadataIcons = (
  fields: Partial<Record<string, unknown[]>>
): ServiceMetadataIconsRaw => {
  return {
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: '',
    },
    cloud: {
      provider: normalizeValue<string>(fields[CLOUD_PROVIDER]),
      service: {
        name: normalizeValue<string>(fields[CLOUD_PROVIDER]),
      },
    },
    container: normalizeValue<Container>(fields[CONTAINER]),
    kubernetes: normalizeValue<Kubernetes>(fields[KUBERNETES]),
  };
};

// todo(milosz): test it
export const serviceVersionMapping = (
  fields: Partial<Record<string, unknown[]>>
): Pick<Transaction | Span | APMError, 'observer'> => {
  return {
    observer: {
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
      version_major: normalizeValue<number>(fields[OBSERVER_VERSION_MAJOR]),
    },
  };
};

export const metadataAppMetricMapping = (fields: Partial<Record<string, unknown[]>>) => {
  return {
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: normalizeValue<string>(fields[AGENT_VERSION]),
      activation_method: normalizeValue<string>(fields[AGENT_ACTIVATION_METHOD]),
    },
    data_stream: {
      namespace: normalizeValue<string>(fields[DATA_STREAM_NAMESPACE]),
      type: normalizeValue<string>(fields[DATA_STEAM_TYPE]),
      dataset: normalizeValue<string>(fields[DATA_STREAM_DATASET]),
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
    labels: {
      env: normalizeValue<string>(fields[LABEL_ENV]),
      hostname: normalizeValue<string>(fields[LABEL_HOSTNAME]),
    },
    metricset: {
      name: normalizeValue<string>(fields[METRICSET_NAME]),
    },
    nodejs: {
      eventloop: {
        delay: {
          avg: {
            ms: normalizeValue<number>(fields[NODEJS_EVENTLOOP_DELAY_AVG_MS]),
          },
        },
      },
      handles: {
        active: normalizeValue<number>(fields[NODEJS_HANDLES_ACTIVE]),
      },
      memory: {
        arrayBuffers: {
          bytes: normalizeValue<number>(fields[NODEJS_MEMORY_ARRAYBUFFERS_BYTES]),
        },
        external: {
          bytes: normalizeValue<number>(fields[NODEJS_MEMORY_EXTERNAL_BYTES]),
        },
        heap: {
          allocated: {
            bytes: normalizeValue<number>(fields[NODEJS_MEMORY_HEAP_ALLOCATED_BYTES]),
          },
          used: {
            bytes: normalizeValue<number>(fields[NODEJS_MEMORY_HEAP_USED_BYTES]),
          },
        },
      },
      requests: {
        active: normalizeValue<number>(fields[NODEJS_REQUESTS_ACTIVE]),
      },
    },
    observer: {
      hostname: normalizeValue<string>(fields[OBSERVER_HOSTNAME]),
      type: normalizeValue<string>(fields[OBSERVER_TYPE]),
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
    },
    process: {
      args: fields[PROCESS_ARGS] as string[] | undefined,
      parent: {
        pid: normalizeValue<number>(fields[PROCESS_PARENT_PID]),
      },
      pid: normalizeValue<number>(fields[PROCESS_PID]),
      title: normalizeValue<string>(fields[PROCESS_TITLE]),
    },
    processor: {
      event: normalizeValue<string>(fields[PROCESSOR_EVENT]),
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
    system: {
      cpu: {
        total: {
          norm: {
            pct: normalizeValue<number>(fields[METRIC_SYSTEM_CPU_PERCENT]),
          },
        },
      },
      memory: {
        actual: {
          free: normalizeValue<number>(fields[METRIC_SYSTEM_FREE_MEMORY]),
        },
        total: normalizeValue<number>(fields[METRIC_SYSTEM_TOTAL_MEMORY]),
      },
      process: {
        cpu: {
          system: {
            norm: {
              pct: normalizeValue<number>(fields[METRIC_PROCESS_CPU_SYSTEM_NORM_PCT]),
            },
          },
          total: {
            norm: {
              pct: normalizeValue<number>(fields[METRIC_PROCESS_CPU_TOTAL_NORM_PCT]),
            },
          },
          user: {
            norm: {
              pct: normalizeValue<number>(fields[METRIC_PROCESS_CPU_TOTAL_USER_PCT]),
            },
          },
        },
        memory: {
          rss: {
            bytes: normalizeValue<string>(fields[METRIC_PROCESS_MEMORY_RSS_BYTES]),
          },
          size: normalizeValue<string>(fields[METRIC_PROCESS_MEMORY_SIZE]),
        },
      },
    },
  };
};

export const metadataAppTransactionEventMapping = (fields: Partial<Record<string, unknown[]>>) => {
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
    parent: {
      id: normalizeValue<string>(fields[PARENT_ID]),
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: normalizeValue<string>(fields[AGENT_VERSION]),
      activation_method: normalizeValue<string>(fields[AGENT_ACTIVATION_METHOD]),
    },
    process: {
      args: fields[PROCESS_ARGS] as string[] | undefined,
      parent: {
        pid: normalizeValue<number>(fields[PROCESS_PARENT_PID]),
      },
      pid: normalizeValue<number>(fields[PROCESS_PID]),
      title: normalizeValue<string>(fields[PROCESS_TITLE]),
    },
    source: {
      ip: normalizeValue<string>(fields[SOURCE_IP]),
    },
    processor: {
      event: normalizeValue<string>(fields[PROCESSOR_EVENT]),
    },
    url: {
      path: normalizeValue<string>(fields[URL_PATH]),
      original: normalizeValue<string>(fields[URL_ORIGINAL]),
      scheme: normalizeValue<string>(fields[URL_SCHEME]),
      port: normalizeValue<number>(fields[URL_PORT]),
      domain: normalizeValue<string>(fields[URL_DOMAIN]),
      full: normalizeValue<string>(fields[SOURCE_IP]),
    },
    observer: {
      hostname: normalizeValue<string>(fields[OBSERVER_HOSTNAME]),
      type: normalizeValue<string>(fields[OBSERVER_TYPE]),
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
    },
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    data_stream: {
      namespace: normalizeValue<string>(fields[DATA_STREAM_NAMESPACE]),
      type: normalizeValue<string>(fields[DATA_STEAM_TYPE]),
      dataset: normalizeValue<string>(fields[DATA_STREAM_DATASET]),
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
    host: {
      architecture: normalizeValue<string>(fields[HOST_ARCHITECTURE]),
      hostname: normalizeValue<string>(fields[HOST_HOSTNAME]),
      ip: fields[HOST_IP] as string[] | undefined,
      name: normalizeValue<string>(fields[HOST_NAME]),
      os: {
        platform: normalizeValue<string>(fields[HOST_OS_PLATFORM]),
      },
    },
    client: {
      ip: normalizeValue<string>(fields[CLIENT_IP]),
    },
    http: {
      request: {
        headers: {
          Accept: fields[HTTP_REQUEST_HEADERS_ACCEPT] as string[] | undefined,
          Connection: fields[HTTP_REQUEST_HEADERS_CONNECTION] as string[] | undefined,
          'User-Agent': fields[HTTP_REQUEST_HEADERS_USER_AGENT] as string[] | undefined,
          Host: fields[HTTP_REQUEST_HEADERS_HOST] as string[] | undefined,
          'Elastic-Apm-Traceparent': fields[HTTP_REQUEST_HEADERS_ELASTIC_APM_TRACEPARENT] as
            | string[]
            | undefined,
          Tracestate: fields[HTTP_REQUEST_HEADERS_TRACESTATE] as string[] | undefined,
          Traceparent: fields[HTTP_REQUEST_HEADERS_TRACEPARENT] as string[] | undefined,
        },
        method: normalizeValue<string>(fields[HTTP_REQUEST_METHOD]),
      },
      response: {
        headers: {
          'Transfer-Encoding': fields[HTTP_RESPONSE_HEADERS_TRANSFER_ENCODING] as
            | string
            | undefined,
          Connection: fields[HTTP_RESPONSE_HEADERS_CONNECTION] as string | undefined,
          Date: fields[HTTP_RESPONSE_HEADERS_DATE] as string | undefined,
          'X-Powered-By': fields[HTTP_RESPONSE_HEADERS_X_POWERED_BY] as string | undefined,
        },
        status_code: normalizeValue<number>(fields[HTTP_RESPONSE_STATUS_CODE]),
      },
      version: normalizeValue<string>(fields[HTTP_VERSION]),
    },
    event: {
      success_count: normalizeValue<boolean>(fields[EVENT_SUCCESS_COUNT]),
      outcome: normalizeValue<EventOutcome>(fields[EVENT_OUTCOME]),
    },
    transaction: {
      result: normalizeValue<string>(fields[TRANSACTION_RESULT]),
      representative_count: normalizeValue<number>(fields[TRANSACTION_REPRESENTATIVE_COUNT]),
      sampled: normalizeValue<boolean>(fields[TRANSACTION_SAMPLED]),
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
      duration: {
        us: normalizeValue<number>(fields[TRANSACTION_DURATION]),
      },
      type: normalizeValue<string>(fields[TRANSACTION_TYPE]),
      name: normalizeValue<string>(fields[TRANSACTION_NAME]),
      span_count: {
        started: normalizeValue<number>(fields[TRANSACTION_SPAN_COUNT_STARTED]),
      },
    },
    user_agent: {
      original: normalizeValue<string>(fields[USER_AGENT_ORIGINAL]),
      name: normalizeValue<string>(fields[USER_AGENT_NAME]),
      device: {
        name: normalizeValue<string>(fields[USER_AGENT_DEVICE_NAME]),
      },
      version: normalizeValue<string>(fields[USER_AGENT_VERSION]),
    },
    span: {
      id: normalizeValue<string>(fields[SPAN_ID]),
    },
    timestamp: {
      us: normalizeValue<number>(fields[TIMESTAMP]),
    },
  };
};

export const metaDataAppTransactionMetric = (fields: Partial<Record<string, unknown[]>>) => {
  return {
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    _doc_count: normalizeValue<number>(fields[DOC_COUNT]),
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
    },
    data_stream: {
      namespace: normalizeValue<string>(fields[DATA_STREAM_NAMESPACE]),
      type: normalizeValue<string>(fields[DATA_STEAM_TYPE]),
      dataset: normalizeValue<string>(fields[DATA_STREAM_DATASET]),
    },
    event: {
      outcome: normalizeValue<EventOutcome>(fields[EVENT_OUTCOME]),
      success_count: {
        sum: normalizeValue<number>(fields[EVENT_SUCCESS_COUNT_SUM]),
        value_count: normalizeValue<number>(fields[EVENT_SUCCESS_COUNT_VALUE_COUNT]),
      },
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
    metricset: {
      name: normalizeValue<string>(fields[METRICSET_NAME]),
      interval: normalizeValue<string>(fields[METRICSET_INTERVAL]),
    },
    observer: {
      hostname: normalizeValue<string>(fields[OBSERVER_HOSTNAME]),
      type: normalizeValue<string>(fields[OBSERVER_TYPE]),
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
    },
    processor: {
      event: normalizeValue<string>(fields[PROCESSOR_EVENT]),
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
    transaction: {
      duration: {
        histogram: {
          values: fields[TRANSACTION_DURATION_HISTOGRAM_VALUES] as number[] | undefined,
        },
        summary: {
          sum: normalizeValue<number>(fields[TRANSACTION_DURATION_SUMMARY_SUM]),
          value_count: normalizeValue<number>(fields[TRANSACTION_DURATION_SUMMARY_VALUE_COUNT]),
        },
      },
      name: normalizeValue<string>(fields[TRANSACTION_NAME]),
      result: normalizeValue<string>(fields[TRANSACTION_RESULT]),
      type: normalizeValue<string>(fields[TRANSACTION_TYPE]),
    },
  };
};
