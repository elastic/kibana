/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { SavedObjectsClientContract } from 'src/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { OsqueryAppContext } from './osquery_app_context_services';

export interface AgentSelection {
  agents: string[];
  allAgentsSelected: boolean;
  platformsSelected: string[];
  policiesSelected: string[];
}

const PER_PAGE = 9000;

const aggregateResults = async (
  generator: (page: number, perPage: number) => Promise<{ results: string[]; total: number }>
) => {
  const { results, total } = await generator(1, PER_PAGE);
  const totalPages = Math.ceil(total / PER_PAGE);
  let currPage = 2;
  while (currPage <= totalPages) {
    const { results: additionalResults } = await generator(currPage++, PER_PAGE);
    results.push(...additionalResults);
  }

  return uniq<string>(results);
};

export const parseAgentSelection = async (
  soClient: SavedObjectsClientContract,
  context: OsqueryAppContext,
  agentSelection: AgentSelection
) => {
  const selectedAgents: Set<string> = new Set();
  const addAgent = selectedAgents.add.bind(selectedAgents);
  const { allAgentsSelected, platformsSelected, policiesSelected, agents } = agentSelection;
  const agentService = context.service.getAgentService()?.asInternalUser;
  const packagePolicyService = context.service.getPackagePolicyService();
  const kueryFragments = [];

  if (agentService && packagePolicyService) {
    const osqueryPolicies = await aggregateResults(async (page, perPage) => {
      const { items, total } = await packagePolicyService.list(soClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage,
        page,
      });

      return { results: items.map((it) => it.policy_id), total };
    });
    kueryFragments.push(`policy_id:(${uniq(osqueryPolicies).join(' or ')})`);
    if (allAgentsSelected) {
      const kuery = kueryFragments.join(' and ');
      const fetchedAgents = await aggregateResults(async (page, perPage) => {
        const res = await agentService.listAgents({
          perPage,
          page,
          kuery,
          showInactive: false,
        });

        return { results: res.agents.map((agent) => agent.id), total: res.total };
      });
      fetchedAgents.forEach(addAgent);
    } else {
      if (platformsSelected.length > 0 || policiesSelected.length > 0) {
        const groupFragments = [];
        if (platformsSelected.length) {
          groupFragments.push(`local_metadata.os.platform:(${platformsSelected.join(' or ')})`);
        }

        if (policiesSelected.length) {
          groupFragments.push(`policy_id:(${policiesSelected.join(' or ')})`);
        }

        kueryFragments.push(`(${groupFragments.join(' or ')})`);
        const kuery = kueryFragments.join(' and ');
        const fetchedAgents = await aggregateResults(async (page, perPage) => {
          const res = await agentService.listAgents({
            perPage,
            page,
            kuery,
            showInactive: false,
          });

          return { results: res.agents.map((agent) => agent.id), total: res.total };
        });
        fetchedAgents.forEach(addAgent);
      }
    }
  }

  agents.forEach(addAgent);

  return Array.from(selectedAgents);
};
