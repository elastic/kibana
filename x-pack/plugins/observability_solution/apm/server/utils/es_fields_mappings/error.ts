/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACE_ID,
  TRANSACTION_ID,
  PARENT_ID,
  ERROR_ID,
  ERROR_LOG_MESSAGE,
  ERROR_EXCEPTION,
  ERROR_GROUP_ID,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_HANDLED,
  ERROR_EXC_TYPE,
  ERROR_CULPRIT,
  AT_TIMESTAMP,
  APMError,
  OBSERVER_TYPE,
  OBSERVER_VERSION,
  OBSERVER_VERSION_MAJOR,
  AGENT_NAME,
  HOST_NAME,
  PROCESSOR_NAME,
  PROCESSOR_EVENT,
  TRANSACTION_TYPE,
  TRANSACTION_SAMPLED,
  TIMESTAMP,
} from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { Fields } from './types';
import type { WaterfallError } from '../../../common/waterfall/typings';
import type { Exception } from '../../../typings/es_schemas/raw/error_raw';
import { normalizeValue } from './es_fields_mappings_helpers';
import { serviceMapping } from './service';

export const errorDocsMapping = (fields: Fields): WaterfallError | undefined => {
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
    ...serviceMapping(fields),
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

export const errorGroupMainStatisticsMapping = (fields: Fields) => {
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

export const errorSampleDetailsMapping = (fields: Fields): APMError | undefined => {
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
    ...serviceMapping(fields),
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
