/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import hash from 'object-hash';
import { Setup } from '../../helpers/setup_request';
import {
  AgentConfiguration,
  AgentConfigurationIntake,
} from '../../../../common/agent_configuration/configuration_types';
import { APMIndexDocumentParams } from '../../helpers/es_client';

export async function createOrUpdateConfiguration({
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

  return internalClient.index(params);
}
