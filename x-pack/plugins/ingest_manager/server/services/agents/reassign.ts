/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import Boom from 'boom';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentSOAttributes } from '../../types';
import { agentConfigService } from '../agent_config';

export async function reassignAgent(
  soClient: SavedObjectsClientContract,
  agentId: string,
  newConfigId: string
) {
  const config = await agentConfigService.get(soClient, newConfigId);
  if (!config) {
    throw Boom.notFound(`Agent Configuration not found: ${newConfigId}`);
  }

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    config_id: newConfigId,
    config_revision: null,
  });
}
