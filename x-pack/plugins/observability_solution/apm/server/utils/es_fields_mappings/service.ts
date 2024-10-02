/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APMError,
  OBSERVER_VERSION,
  OBSERVER_VERSION_MAJOR,
  AGENT_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_LANGUAGE_VERSION,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_VERSION,
} from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { Transaction } from '../../../typings/es_schemas/ui/transaction';
import type { Span } from '../../../typings/es_schemas/ui/span';
import type { Fields } from './types';
import { cleanUndefinedFields, normalizeValue } from './es_fields_mappings_helpers';
import { cloudMapping } from '.';

export const serviceMapping = (fields: Fields) => ({
  service: cleanUndefinedFields({
    name: normalizeValue<string>(fields[SERVICE_NAME]),
    environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
    framework: cleanUndefinedFields({
      name: normalizeValue<string>(fields[SERVICE_FRAMEWORK_NAME]),
      versions: normalizeValue<string>(fields[SERVICE_FRAMEWORK_VERSION]),
    }),
    node: {
      name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
    },
    runtime: cleanUndefinedFields({
      name: normalizeValue<string>(fields[SERVICE_RUNTIME_NAME]),
      version: normalizeValue<string>(fields[SERVICE_RUNTIME_VERSION]),
    }),
    language: cleanUndefinedFields({
      name: normalizeValue<string>(fields[SERVICE_LANGUAGE_NAME]),
      version: normalizeValue<string>(fields[SERVICE_LANGUAGE_VERSION]),
    }),
    version: normalizeValue<string>(fields[SERVICE_VERSION]),
  }),
});

// todo: check https://github.com/jennypavlova/kibana/pull/6#discussion_r1771611817
export const serviceVersionMapping = (
  fields: Fields
): Pick<Transaction | Span | APMError, 'observer'> | undefined => {
  if (!fields) return undefined;

  return {
    observer: {
      version: normalizeValue<string>(fields[OBSERVER_VERSION]),
      version_major: normalizeValue<number>(fields[OBSERVER_VERSION_MAJOR]),
    },
  };
};

export const serviceAgentNameMapping = (fields: Fields) => {
  if (!fields) return undefined;

  return {
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
    },
    service: serviceMapping(fields),
    ...cloudMapping(fields),
  };
};
