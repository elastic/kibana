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

export async function reassignAgents(
  soClient: SavedObjectsClientContract,
  toUnenrollIds: string[],
  newConfigId: string
) {
  const config = await agentConfigService.get(soClient, newConfigId);
  if (!config) {
    throw Boom.notFound(`Agent Configuration not found: ${newConfigId}`);
  }

  const results = await soClient.bulkUpdate<AgentSOAttributes>(
    toUnenrollIds.map(id => ({
      type: AGENT_SAVED_OBJECT_TYPE,
      id,
      attributes: {
        config_id: newConfigId,
        config_revision: null,
        config_newest_revision: config.revision,
      },
    }))
  );

  return results.saved_objects.map(result => ({
    id: result.id,
    success: !result.error,
    error: result.error,
  }));
}
