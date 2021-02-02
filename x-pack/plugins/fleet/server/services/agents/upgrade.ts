/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { AgentAction, AgentActionSOAttributes } from '../../types';
import { AGENT_ACTION_SAVED_OBJECT_TYPE } from '../../constants';
import { bulkCreateAgentActions, createAgentAction } from './actions';
import { getAgents, listAllAgents, updateAgent, bulkUpdateAgents } from './crud';
import { isAgentUpgradeable } from '../../../common/services';
import { appContextService } from '../app_context';

export async function sendUpgradeAgentAction({
  soClient,
  esClient,
  agentId,
  version,
  sourceUri,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  agentId: string;
  version: string;
  sourceUri: string | undefined;
}) {
  const now = new Date().toISOString();
  const data = {
    version,
    source_uri: sourceUri,
  };
  await createAgentAction(soClient, esClient, {
    agent_id: agentId,
    created_at: now,
    data,
    ack_data: data,
    type: 'UPGRADE',
  });
  await updateAgent(soClient, esClient, agentId, {
    upgraded_at: null,
    upgrade_started_at: now,
  });
}

export async function ackAgentUpgraded(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentAction: AgentAction
) {
  const {
    attributes: { ack_data: ackData },
  } = await soClient.get<AgentActionSOAttributes>(AGENT_ACTION_SAVED_OBJECT_TYPE, agentAction.id);
  if (!ackData) throw new Error('data missing from UPGRADE action');
  const { version } = JSON.parse(ackData);
  if (!version) throw new Error('version missing from UPGRADE action');
  await updateAgent(soClient, esClient, agentAction.agent_id, {
    upgraded_at: new Date().toISOString(),
    upgrade_started_at: null,
  });
}

export async function sendUpgradeAgentsActions(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options:
    | {
        agentIds: string[];
        sourceUri: string | undefined;
        version: string;
        force?: boolean;
      }
    | {
        kuery: string;
        sourceUri: string | undefined;
        version: string;
        force?: boolean;
      }
) {
  const kibanaVersion = appContextService.getKibanaVersion();
  // Filter out agents currently unenrolling, agents unenrolled, and agents not upgradeable
  const agents =
    'agentIds' in options
      ? await getAgents(soClient, esClient, options.agentIds)
      : (
          await listAllAgents(soClient, esClient, {
            kuery: options.kuery,
            showInactive: false,
          })
        ).agents;
  const agentsToUpdate = options.force
    ? agents
    : agents.filter((agent) => isAgentUpgradeable(agent, kibanaVersion));
  const now = new Date().toISOString();
  const data = {
    version: options.version,
    source_uri: options.sourceUri,
  };
  // Create upgrade action for each agent
  await bulkCreateAgentActions(
    soClient,
    esClient,
    agentsToUpdate.map((agent) => ({
      agent_id: agent.id,
      created_at: now,
      data,
      ack_data: data,
      type: 'UPGRADE',
    }))
  );

  return await bulkUpdateAgents(
    soClient,
    esClient,
    agentsToUpdate.map((agent) => ({
      agentId: agent.id,
      data: {
        upgraded_at: null,
        upgrade_started_at: now,
      },
    }))
  );
}
