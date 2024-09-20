/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '@kbn/elastic-agent-utils';
import { Span } from '@kbn/apm-types';
import {
  AGENT_NAME,
  AGENT_VERSION,
  AT_TIMESTAMP,
  DATA_STEAM_TYPE,
  DATA_STREAM_DATASET,
  DATA_STREAM_NAMESPACE,
  EVENT_OUTCOME,
  EVENT_SUCCESS_COUNT,
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
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_LINKS_SPAN_ID,
  SPAN_LINKS_TRACE_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
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
} from '@kbn/apm-types/src/es_fields/apm';
import { EventOutcome } from '../../common/event_outcome';

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

const normalizeValue = <T>(field: unknown[] | unknown): T => {
  return (Array.isArray(field) && field.length > 0 ? field[0] : field) as T;
};
