/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_RUNTIME_NAME,
  SERVICE_NAME,
  SERVICE_VERSION,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_LANGUAGE_VERSION,
  AGENT_NAME,
  AGENT_VERSION,
  HOST_ARCHITECTURE,
  HOST_HOSTNAME,
  HOST_NAME,
  HOST_IP,
  HOST_OS_PLATFORM,
  type TransactionRaw,
} from '@kbn/apm-types';
import { AgentName } from '@kbn/elastic-agent-utils';
import { normalizeValue } from './es_fields_mappings_helpers';
import type { Fields } from './types';
import { cloudMapping, containerMapping, kubernetesMapping } from '.';

type ServiceMetadataIconsRaw = Pick<TransactionRaw, 'kubernetes' | 'cloud' | 'container' | 'agent'>;
type ServiceMetadataDetailsRaw = Pick<
  TransactionRaw,
  'service' | 'agent' | 'host' | 'container' | 'kubernetes' | 'cloud' | 'labels'
>;

export const serviceMetadataDetailsMapping = (
  fields: Fields
): ServiceMetadataDetailsRaw | undefined => {
  if (!fields) return undefined;
  const serviceRuntimeName = normalizeValue<string>(fields[SERVICE_RUNTIME_NAME]);
  return {
    service: {
      name: normalizeValue<string>(fields[SERVICE_NAME]),
      version: normalizeValue<string>(fields[SERVICE_VERSION]),
      environment: normalizeValue<string>(fields[SERVICE_ENVIRONMENT]),
      framework: {
        name: normalizeValue<string>(fields[SERVICE_FRAMEWORK_NAME]),
        version: normalizeValue<string>(fields[SERVICE_FRAMEWORK_VERSION]),
      },
      node: {
        name: normalizeValue<string>(fields[SERVICE_NODE_NAME]),
      },
      ...(serviceRuntimeName
        ? {
            runtime: {
              name: serviceRuntimeName,
              version: normalizeValue<string>(fields[SERVICE_RUNTIME_VERSION]),
            },
          }
        : undefined),
      language: {
        name: normalizeValue<string>(fields[SERVICE_LANGUAGE_NAME]),
        version: normalizeValue<string>(fields[SERVICE_LANGUAGE_VERSION]),
      },
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: normalizeValue<AgentName>(fields[AGENT_VERSION]),
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
    ...containerMapping(fields),
    ...kubernetesMapping(fields),
    ...cloudMapping(fields),
  };
};

export const serviceMetadataIconsMapping = (
  fields: Fields
): ServiceMetadataIconsRaw | undefined => {
  if (!fields) return undefined;
  return {
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
      version: '',
    },
    ...cloudMapping(fields),
    ...containerMapping(fields),
    ...kubernetesMapping(fields),
  };
};
