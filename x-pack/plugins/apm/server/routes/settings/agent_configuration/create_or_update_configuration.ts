/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import hash from 'object-hash';
import { Setup } from '../../../lib/helpers/setup_request';
import {
  AgentConfiguration,
  AgentConfigurationIntake,
} from '../../../../common/agent_configuration/configuration_types';
import { APMIndexDocumentParams } from '../../../lib/helpers/create_es_client/create_internal_es_client';

export function createOrUpdateConfiguration({
  configurationId,
  configurationIntake,
  setup,
}: {
  configurationId?: string;
  configurationIntake: AgentConfigurationIntake;
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  const params: APMIndexDocumentParams<AgentConfiguration> = {
    refresh: true,
    index: indices.apmAgentConfigurationIndex,
    body: {
      agent_name: configurationIntake.agent_name,
      service: {
        name: configurationIntake.service.name,
        environment: configurationIntake.service.environment,
      },
      settings: configurationIntake.settings,
      '@timestamp': Date.now(),
      applied_by_agent: false,
      etag: hash(configurationIntake),
    },
  };

  // by specifying an id elasticsearch will delete the previous doc and insert the updated doc
  if (configurationId) {
    params.id = configurationId;
  }

  return internalClient.index('create_or_update_agent_configuration', params);
}
