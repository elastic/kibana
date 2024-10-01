/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACE_ID,
  PARENT_ID,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  AGENT_NAME,
  EventOutcome,
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  TRANSACTION_RESULT,
  TRANSACTION_ID,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  FAAS_COLDSTART,
  SPAN_ID,
  SPAN_NAME,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  SPAN_DURATION,
  SPAN_ACTION,
  SpanLink,
  SPAN_COMPOSITE_COUNT,
  SPAN_COMPOSITE_SUM,
  SPAN_COMPOSITE_COMPRESSION_STRATEGY,
  SPAN_SYNC,
  CHILD_ID,
  TIMESTAMP,
} from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { normalizeValue } from './es_fields_mappings_helpers';
import type { WaterfallTransaction, WaterfallSpan } from '../../../common/waterfall/typings';
import type { Fields } from './types';
import { linkedParentsOfSpanMapping } from './span_links';

export const traceDocMapping = (
  fields: Fields
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
