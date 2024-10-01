/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SPAN_TYPE,
  SPAN_SUBTYPE,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  SPAN_ID,
  SPAN_NAME,
  SPAN_DURATION,
  TRACE_ID,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  AGENT_NAME,
  EventOutcome,
  EVENT_OUTCOME,
  AT_TIMESTAMP,
} from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { Fields } from './types';
import { normalizeValue } from './es_fields_mappings_helpers';

export const metadataForDependencyMapping = (fields: Fields) => {
  if (!fields) return undefined;

  return {
    span: {
      type: normalizeValue<string>(fields[SPAN_TYPE]),
      subtype: normalizeValue<string>(fields[SPAN_SUBTYPE]),
    },
  };
};

export const transactionsForDependencySpansMapping = (fields: Fields) => {
  if (!fields) return undefined;

  return {
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
      name: normalizeValue<string>(fields[TRANSACTION_NAME]),
      type: normalizeValue<string>(fields[TRANSACTION_TYPE]),
    },
  };
};

export const topDependencySpansMapping = (fields: Fields) => {
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
