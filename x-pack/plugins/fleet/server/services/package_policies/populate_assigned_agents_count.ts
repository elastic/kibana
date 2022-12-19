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
export const populateAssignedAgentsCount = async (
  esClient: ElasticsearchClient,
  packagePolicies: PackagePolicy[]
) => {
  await pMap(
    packagePolicies,
    async (packagePolicy) => {
      const { total: agentTotal } = await getAgentsByKuery(esClient, {
        showInactive: false,
        perPage: 0,
        page: 1,
        kuery: `${AGENTS_PREFIX}.policy_id:${packagePolicy.policy_id}`,
      });

      packagePolicy.agents = agentTotal ?? 0;
    },
    { concurrency: 10 }
  );
};
