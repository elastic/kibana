/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
import { serviceMapping } from './service';

type ServiceMetadataIconsRaw = Pick<TransactionRaw, 'kubernetes' | 'cloud' | 'container' | 'agent'>;
type ServiceMetadataDetailsRaw = Pick<
  TransactionRaw,
  'service' | 'agent' | 'host' | 'container' | 'kubernetes' | 'cloud' | 'labels'
>;

export const serviceMetadataDetailsMapping = (
  fields: Fields
): ServiceMetadataDetailsRaw | undefined => {
  if (!fields) return undefined;
  return {
    ...serviceMapping(fields),
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
