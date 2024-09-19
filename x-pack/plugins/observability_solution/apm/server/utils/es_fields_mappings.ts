/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '@kbn/elastic-agent-utils';
import { Span } from '@kbn/apm-types';
import { EventOutcome } from '../../common/event_outcome';

export const metadataForDependencyMapping = (fields: Partial<Record<string, unknown[]>>) => {
  return {
    span: {
      type: normalizeValue<string>(fields['span.type']),
      subtype: normalizeValue<string>(fields['span.subtype']),
    },
  };
};

export const transactionsForDependencySpansMapping = (
  fields: Partial<Record<string, unknown[]>>
) => {
  return {
    transaction: {
      id: normalizeValue<string>(fields['transaction.id']),
      name: normalizeValue<string>(fields['transaction.name']),
      type: normalizeValue<string>(fields['transaction.type']),
    },
  };
};

export const topDependencySpansMapping = (fields: Partial<Record<string, unknown[]>>) => {
  return {
    transaction: {
      id: normalizeValue<string>(fields['transaction.id']),
    },
    span: {
      id: normalizeValue<string>(fields['span.id']),
      name: normalizeValue<string>(fields['span.name']),
      duration: {
        us: normalizeValue<number>(fields['span.duration.us']),
      },
    },
    trace: {
      id: normalizeValue<string>(fields['trace.id']),
    },
    service: {
      name: normalizeValue<string>(fields['service.name']),
      environment: normalizeValue<string>(fields['service.environment']),
    },
    agent: {
      name: normalizeValue<AgentName>(fields['agent.name']),
    },
    event: {
      outcome: normalizeValue<EventOutcome>(fields['event.outcome']),
    },
    '@timestamp': normalizeValue<string>(fields['@timestamp']),
  };
};

// todo(milosz): test with otel APM POC, mapping format wasn't confirmed with `fields`
export const spanMapping = (fields: Partial<Record<string, unknown[]>>): Span => {
  return {
    parent: {
      id: normalizeValue<string>(fields['parent.id']),
    },
    observer: {
      type: normalizeValue<string>(fields['observer.type']),
      version: normalizeValue<string>(fields['observer.version']),
      version_major: normalizeValue<number>(fields['observer.version_major']),
    },
    agent: {
      name: normalizeValue<AgentName>(fields['agent.name']),
      version: normalizeValue<string>(fields['agent.version']),
    },
    trace: {
      id: normalizeValue<string>(fields['trace.id']),
    },
    '@timestamp': normalizeValue<string>(fields['@timestamp']),
    service: {
      name: normalizeValue<string>(fields['service.name']),
      environment: normalizeValue<string>(fields['service.environment']),
    },
    event: {
      outcome: normalizeValue<EventOutcome>(fields['event.outcome']),
    },
    processor: {
      name: normalizeValue<'transaction'>(fields['processor.name']),
      event: normalizeValue<'span'>(fields['processor.event']),
    },
    transaction: {
      id: normalizeValue<string>(fields['transaction.id']),
    },
    span: {
      duration: {
        us: normalizeValue<number>(fields['span.duration.us']),
      },
      subtype: normalizeValue<string>(fields['span.subtype']),
      name: normalizeValue<string>(fields['span.name']),
      destination: {
        service: {
          resource: normalizeValue<string>(fields['span.destination.service.resource']),
        },
      },
      id: normalizeValue<string>(fields['span.id']),
      type: normalizeValue<string>(fields['span.type']),
    },
    timestamp: {
      us: normalizeValue<number>(fields['timestamp.us']),
    },
  };
};

export const spanLinksDetailsMapping = (fields: Partial<Record<string, unknown[]>>) => {
  return {
    trace: {
      id: normalizeValue<string>(fields['trace.id']),
    },
    span: {
      id: normalizeValue<string>(fields['span.id']),
      name: normalizeValue<string>(fields['span.name']),
      type: normalizeValue<string>(fields['span.type']),
      subtype: normalizeValue<string>(fields['span.subtype']),
      duration: {
        us: normalizeValue<number>(fields['span.duration.us']),
      },
    },
    transaction: {
      id: normalizeValue<string>(fields['transaction.id']),
      name: normalizeValue<string>(fields['transaction.name']),
      duration: {
        us: normalizeValue<string>(fields['transaction.duration.us']),
      },
    },
    service: {
      name: normalizeValue<string>(fields['service.name']),
      environment: normalizeValue<string>(fields['service.environment']),
    },
    processor: {
      event: normalizeValue<'span'>(fields['processor.event']),
    },
    agent: {
      name: normalizeValue<AgentName>(fields['agent.name']),
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
            id: normalizeValue<string>(fields['span.links.trace.id']),
          },
          span: {
            // todo(milosz): confirm `span.links.span.id` format
            id: normalizeValue<string>(fields['span.links.span.id']),
          },
        },
      ],
    },
  };
};

const normalizeValue = <T>(field: unknown[] | unknown): T => {
  return (Array.isArray(field) && field.length > 0 ? field[0] : field) as T;
};
