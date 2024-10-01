/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AT_TIMESTAMP,
  AGENT_NAME,
  AGENT_VERSION,
  AGENT_ACTIVATION_METHOD,
  HOST_ARCHITECTURE,
  HOST_HOSTNAME,
  HOST_NAME,
  HOST_IP,
  HOST_OS_PLATFORM,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_LANGUAGE_VERSION,
  SERVICE_VERSION,
} from '@kbn/apm-types';
import { AgentName } from '@kbn/elastic-agent-utils';
import { normalizeValue } from './es_fields_mappings_helpers';
import { Fields } from './types';
import { cloudMapping, containerMapping, kubernetesMapping } from '.';

export const serviceInstanceMetadataDetailsMapping = (fields: Fields = {}) => {
  if (!fields) return undefined;

  return {
    '@timestamp': normalizeValue<string>(fields[AT_TIMESTAMP]),
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: normalizeValue<string>(fields[AGENT_VERSION]),
      activation_method: normalizeValue<string>(fields[AGENT_ACTIVATION_METHOD]),
    },
    host: {
      architecture: normalizeValue<string>(fields[HOST_ARCHITECTURE]),
      hostname: normalizeValue<string>(fields[HOST_HOSTNAME]),
      name: normalizeValue<string>(fields[HOST_NAME]),
      ip: normalizeValue<string>(fields[HOST_IP]),
      os: {
        platform: normalizeValue<string>(fields[HOST_OS_PLATFORM]),
      },
    },
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
      framework: {
        name: normalizeValue<string>(fields[SERVICE_FRAMEWORK_NAME]),
        versions: normalizeValue<string>(fields[SERVICE_FRAMEWORK_VERSION]),
      },
      node: {
        name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
      },
      runtime: {
        name: normalizeValue<string>(fields[SERVICE_RUNTIME_NAME]),
        version: normalizeValue<string>(fields[SERVICE_RUNTIME_VERSION]),
      },
      language: {
        name: normalizeValue<string>(fields[SERVICE_LANGUAGE_NAME]),
        version: normalizeValue<string>(fields[SERVICE_LANGUAGE_VERSION]),
      },
      version: normalizeValue<string>(fields[SERVICE_VERSION]),
    },
    ...containerMapping(fields),
    ...kubernetesMapping(fields),
    ...cloudMapping(fields),
  };
};
