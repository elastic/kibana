/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import { AGENTS_PREFIX } from '../../constants';

import { getAgentsByKuery } from './crud';
import { unenrollAgent } from './unenroll';

export async function unenrollForAgentPolicyId(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  policyId: string
) {
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { agents } = await getAgentsByKuery(esClient, {
      kuery: `${AGENTS_PREFIX}.policy_id:"${policyId}"`,
      page: page++,
      perPage: 1000,
      showInactive: false,
    });

    if (agents.length === 0) {
      hasMore = false;
    }
    for (const agent of agents) {
      await unenrollAgent(soClient, esClient, agent.id);
    }
  }
}
