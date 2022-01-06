/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from 'src/core/server';

import { appContextService } from '../app_context';
import { setupFleet } from '../setup';
import { AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../constants';
import { agentPolicyService } from '../agent_policy';
import { getAgentsByKuery, forceUnenrollAgent } from '../agents';
import { listEnrollmentApiKeys, deleteEnrollmentApiKey } from '../api_keys';

export async function resetPreconfiguredAgentPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const logger = appContextService.getLogger();
  logger.warn('Reseting Fleet preconfigured agent policies');
  await _deleteExistingData(soClient, esClient, logger);

  await setupFleet(soClient, esClient);
}

async function _deleteExistingData(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  logger: Logger
) {
  const existingPolicies = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_preconfigured:true`,
  });
  // unenroll all the agents enroled in this policies
  const { agents } = await getAgentsByKuery(esClient, {
    showInactive: false,
    perPage: SO_SEARCH_LIMIT,
    kuery: existingPolicies.items.map((policy) => `policy_id:"${policy.id}"`).join(' or '),
  });

  // Delete
  if (agents.length > 0) {
    logger.info(`Force unenrolling ${agents.length} agents`);
    await pMap(agents, (agent) => forceUnenrollAgent(soClient, esClient, agent.id), {
      concurrency: 20,
    });
  }

  const { items: enrollmentApiKeys } = await listEnrollmentApiKeys(esClient, {
    perPage: SO_SEARCH_LIMIT,
    showInactive: true,
  });

  if (enrollmentApiKeys.length > 0) {
    logger.info(`Deleting ${enrollmentApiKeys.length} enrollment api keys`);
    await pMap(
      enrollmentApiKeys,
      (enrollmentKey) => deleteEnrollmentApiKey(esClient, enrollmentKey.id, true),
      {
        concurrency: 20,
      }
    );
  }
  if (existingPolicies.items.length > 0) {
    logger.info(`Deleting ${existingPolicies.items.length} agent policies`);
    await pMap(
      existingPolicies.items,
      (policy) =>
        agentPolicyService.delete(soClient, esClient, policy.id, {
          force: true,
          removeFleetServerDocuments: true,
        }),
      {
        concurrency: 20,
      }
    );
  }
}
