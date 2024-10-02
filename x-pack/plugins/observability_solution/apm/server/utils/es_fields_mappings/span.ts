/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PARENT_ID,
  OBSERVER_TYPE,
  OBSERVER_VERSION,
  OBSERVER_VERSION_MAJOR,
  AGENT_NAME,
  AGENT_VERSION,
  TRACE_ID,
  AT_TIMESTAMP,
  EventOutcome,
  EVENT_OUTCOME,
  EVENT_SUCCESS_COUNT,
  PROCESSOR_NAME,
  PROCESSOR_EVENT,
  TRANSACTION_ID,
  SPAN_DURATION,
  SPAN_SUBTYPE,
  SPAN_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_TYPE,
  SPAN_REPRESENTATIVE_COUNT,
  HTTP_RESPONSE_STATUS_CODE,
  DATA_STREAM_NAMESPACE,
  DATA_STEAM_TYPE,
  DATA_STREAM_DATASET,
  TIMESTAMP,
} from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { normalizeValue } from './es_fields_mappings_helpers';
import type { Fields } from './types';
import { serviceMapping } from './service';

export const spanMapping = (fields: Fields) => {
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
    ...serviceMapping(fields),
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
