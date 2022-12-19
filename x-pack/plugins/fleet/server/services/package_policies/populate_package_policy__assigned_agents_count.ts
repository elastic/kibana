/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import pMap from 'p-map';

import type { PackagePolicy } from '../../../common';

import { AGENTS_PREFIX } from '../../../common';
import { getAgentsByKuery } from '../agents';

/**
 * Mutates each of the Package Policies passed on input and adds `agents` property to it with the
 * count of agents currently using the given agent policy.
 * @param esClient
 * @param packagePolicies
 */
export const populatePackagePolicyAssignedAgentsCount = async (
  esClient: ElasticsearchClient,
  packagePolicies: PackagePolicy[]
) => {
  const agentPolicyRequestsByIdCache: Record<string, ReturnType<typeof getAgentsByKuery>> = {};

  await pMap(
    packagePolicies,
    async (packagePolicy) => {
      const agentPolicyId = packagePolicy.policy_id;
      let agentsByQueryPromise: ReturnType<typeof getAgentsByKuery>;

      if (Boolean(agentPolicyRequestsByIdCache[agentPolicyId])) {
        agentsByQueryPromise = agentPolicyRequestsByIdCache[agentPolicyId];
      } else {
        agentsByQueryPromise = getAgentsByKuery(esClient, {
          showInactive: false,
          perPage: 0,
          page: 1,
          kuery: `${AGENTS_PREFIX}.policy_id:${agentPolicyId}`,
        });

        agentPolicyRequestsByIdCache[agentPolicyId] = agentsByQueryPromise;
      }

      packagePolicy.agents = (await agentsByQueryPromise).total;
    },
    { concurrency: 10 }
  );
};
