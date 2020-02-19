/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import hash from 'object-hash';
import { Setup } from '../../helpers/setup_request';
import { AgentConfiguration } from './configuration_types';
import { APMIndexDocumentParams } from '../../helpers/es_client';

export async function createOrUpdateConfiguration({
  configurationId,
  configuration,
  setup
}: {
  configurationId?: string;
  configuration: Omit<
    AgentConfiguration,
    '@timestamp' | 'applied_by_agent' | 'etag'
  >;
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  const params: APMIndexDocumentParams<AgentConfiguration> = {
    refresh: true,
    index: indices.apmAgentConfigurationIndex,
    body: {
      agent_name: configuration.agent_name,
      service: {
        name: configuration.service.name,
        environment: configuration.service.environment
      },
      settings: configuration.settings,
      '@timestamp': Date.now(),
      applied_by_agent: false,
      etag: hash(configuration)
    }
  };

  // by specifying an id elasticsearch will delete the previous doc and insert the updated doc
  if (configurationId) {
    params.id = configurationId;
  }

  return internalClient.index(params);
}
