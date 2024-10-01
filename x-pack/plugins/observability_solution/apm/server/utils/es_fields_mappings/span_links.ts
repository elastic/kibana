/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACE_ID,
  SPAN_ID,
  SPAN_NAME,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  SPAN_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_DURATION,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  PROCESSOR_EVENT,
  AGENT_NAME,
  SPAN_LINKS_TRACE_ID,
  SPAN_LINKS_SPAN_ID,
  type SpanLink,
} from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { Fields } from './types';
import { normalizeValue } from './es_fields_mappings_helpers';

export const spanLinksDetailsMapping = (fields: Fields) => {
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
export const linkedParentsOfSpanMapping = (fields: Fields) => {
  if (!fields ?? !fields[SPAN_LINKS_TRACE_ID]) return [];

  return (fields[SPAN_LINKS_TRACE_ID] as string[])?.map((v, index) => {
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
