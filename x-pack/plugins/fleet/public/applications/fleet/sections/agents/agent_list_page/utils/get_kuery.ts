/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentStatusKueryHelper } from '../../../../services';
import { AGENTS_PREFIX } from '../../../../constants';

export const getKuery = ({
  search,
  selectedAgentPolicies,
  selectedPoliciesByOutputs,
  selectedTags,
  selectedStatus,
  selectedAgentIds,
}: {
  search?: string;
  selectedAgentPolicies?: string[];
  selectedPoliciesByOutputs?: string[];
  selectedTags?: string[];
  selectedStatus?: string[];
  selectedAgentIds?: string[];
}) => {
  let kueryBuilder = '';
  if (search) {
    kueryBuilder = search.trim();
  }

  if (selectedAgentPolicies?.length) {
    if (kueryBuilder) {
      kueryBuilder = `(${kueryBuilder}) and`;
    }
    kueryBuilder = `${kueryBuilder} ${AGENTS_PREFIX}.policy_id : (${selectedAgentPolicies
      .map((agentPolicy) => `"${agentPolicy}"`)
      .join(' or ')})`;
  }

  // this block it's the same as the previous but it's needed to filter out on agent policies selected by outputs
  if (selectedPoliciesByOutputs?.length) {
    if (kueryBuilder) {
      kueryBuilder = `(${kueryBuilder}) and`;
    }
    kueryBuilder = `${kueryBuilder} ${AGENTS_PREFIX}.policy_id : (${selectedPoliciesByOutputs
      .map((agentPolicy) => `"${agentPolicy}"`)
      .join(' or ')})`;
  }

  if (selectedTags?.length) {
    if (kueryBuilder) {
      kueryBuilder = `(${kueryBuilder}) and`;
    }
    kueryBuilder = `${kueryBuilder} ${AGENTS_PREFIX}.tags : (${selectedTags
      .map((tag) => `"${tag}"`)
      .join(' or ')})`;
  }

  if (selectedAgentIds?.length) {
    if (kueryBuilder) {
      kueryBuilder = `(${kueryBuilder}) and`;
    }
    kueryBuilder = `${kueryBuilder} ${AGENTS_PREFIX}.agent.id : (${selectedAgentIds
      .map((id) => `"${id}"`)
      .join(' or ')})`;
  }

  if (selectedStatus?.length) {
    const kueryStatus = selectedStatus
      .map((status) => {
        switch (status) {
          case 'healthy':
            return AgentStatusKueryHelper.buildKueryForOnlineAgents();
          case 'unhealthy':
            return AgentStatusKueryHelper.buildKueryForErrorAgents();
          case 'offline':
            return AgentStatusKueryHelper.buildKueryForOfflineAgents();
          case 'updating':
            return AgentStatusKueryHelper.buildKueryForUpdatingAgents();
          case 'inactive':
            return AgentStatusKueryHelper.buildKueryForInactiveAgents();
          case 'unenrolled':
            return AgentStatusKueryHelper.buildKueryForUnenrolledAgents();
        }

        return undefined;
      })
      .filter((statusKuery) => statusKuery !== undefined)
      .join(' or ');

    if (kueryBuilder) {
      kueryBuilder = `(${kueryBuilder}) and (${kueryStatus})`;
    } else {
      kueryBuilder = kueryStatus;
    }
  }
  return kueryBuilder.trim();
};
