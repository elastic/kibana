/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRANSACTION_REPRESENTATIVE_COUNT,
  TRANSACTION_RESULT,
  TRANSACTION_SAMPLED,
  TRANSACTION_ID,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  SERVICE_NODE_NAME,
  SERVICE_NAME,
  SERVICE_FRAMEWORK_NAME,
  TRACE_ID,
  AGENT_NAME,
  AGENT_VERSION,
  EVENT_SUCCESS_COUNT,
  EventOutcome,
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  PROCESSOR_NAME,
  DATA_STREAM_NAMESPACE,
  DATA_STEAM_TYPE,
  DATA_STREAM_DATASET,
  SPAN_ID,
  OBSERVER_HOSTNAME,
  OBSERVER_TYPE,
  OBSERVER_VERSION,
  OBSERVER_VERSION_MAJOR,
  AT_TIMESTAMP,
  LABEL_NAME,
  LABEL_GC,
  LABEL_TYPE,
  LABEL_TELEMETRY_AUTO_VERSION,
  LABEL_LIFECYCLE_STATE,
  TIMESTAMP,
} from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { isOptionalFieldDefined, normalizeValue } from './es_fields_mappings_helpers';
import type { Fields } from './types';
import { linkedParentsOfSpanMapping } from './span_links';

export const transactionMapping = (fields: Fields) => {
  if (!fields) return { transaction: undefined };

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
    ...(isOptionalFieldDefined(fields, 'labels.')
      ? {
          labels: {
            name: normalizeValue<string | undefined>(fields[LABEL_NAME]),
            gc: normalizeValue<string | undefined>(fields[LABEL_GC]),
            type: normalizeValue<string | undefined>(fields[LABEL_TYPE]),
            telemetry_auto_version: normalizeValue<string | undefined>(
              fields[LABEL_TELEMETRY_AUTO_VERSION]
            ),
            lifecycle_state: normalizeValue<string | undefined>(fields[LABEL_LIFECYCLE_STATE]),
          },
        }
      : undefined),
  };
};
