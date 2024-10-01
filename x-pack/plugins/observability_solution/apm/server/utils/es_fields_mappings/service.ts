/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMError, OBSERVER_VERSION, OBSERVER_VERSION_MAJOR, AGENT_NAME } from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { Transaction } from '../../../typings/es_schemas/ui/transaction';
import type { Span } from '../../../typings/es_schemas/ui/span';
import type { Fields } from './types';
import { normalizeValue } from './es_fields_mappings_helpers';

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

// todo: missing `cloud` and `service` properties
export const serviceAgentNameMapping = (fields: Fields) => {
  if (!fields) return undefined;

  return {
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
    },
  };
};
