/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { AgentAction, AgentSOAttributes } from '../../types';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { createAgentAction } from './actions';

export async function sendUpgradeAgentAction(
  soClient: SavedObjectsClientContract,
  agentId: string
) {
  const now = new Date().toISOString();
  await createAgentAction(soClient, {
    agent_id: agentId,
    created_at: now,
    version: '8.0.0',
    source_uri: 'https://artifacts.elastic.co/downloads/beats/',
    type: 'UPGRADE',
  });
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    upgrade_started_at: now,
  });
}

export async function ackAgentUpgraded(
  soClient: SavedObjectsClientContract,
  agentAction: AgentAction
) {
  if (!agentAction.version) throw new Error('version is missing in UPGRADE action');
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentAction.agent_id, {
    upgraded_at: new Date().toISOString(),
    local_metadata: {
      elastic: {
        agent: {
          version: agentAction.version,
        },
      },
    },
  });
}
