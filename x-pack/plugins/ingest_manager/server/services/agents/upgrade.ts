/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { AgentAction, AgentSOAttributes } from '../../types';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { createAgentAction } from './actions';

export async function sendUpgradeAgentAction({
  soClient,
  agentId,
  version,
  sourceUri,
}: {
  soClient: SavedObjectsClientContract;
  agentId: string;
  version: string;
  sourceUri: string;
}) {
  const now = new Date().toISOString();
  await createAgentAction(soClient, {
    agent_id: agentId,
    created_at: now,
    data: {
      version,
      source_uri: sourceUri,
    },
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
  if (!agentAction.data.version) throw new Error('version is missing in UPGRADE action');
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentAction.agent_id, {
    upgraded_at: new Date().toISOString(),
    local_metadata: {
      elastic: {
        agent: {
          version: agentAction.data.version,
        },
      },
    },
  });
}
