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
} from '@kbn/apm-types';
import {
  WaterfallError,
  WaterfallSpan,
  WaterfallTransaction,
} from '../../common/waterfall/typings';
import { EventOutcome } from '../../common/event_outcome';
import { Exception } from '../../typings/es_schemas/raw/error_raw';

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
      event: normalizeValue<'span'>(fields[PROCESSOR_EVENT]),
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
      event: normalizeValue<'transaction'>(fields[PROCESSOR_EVENT]),
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

const normalizeValue = <T>(field: unknown[] | unknown): T => {
  return (Array.isArray(field) && field.length > 0 ? field[0] : field) as T;
};
