/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import moment from 'moment';

import { isAgentUpgradeable } from '../../../common/services';

import type { Agent, BulkActionResult } from '../../types';

import { HostedAgentPolicyRestrictionRelatedError, IngestManagerError } from '../../errors';

import { appContextService } from '../app_context';

import { ActionRunner } from './action_runner';

import type { GetAgentsOptions } from './crud';
import { errorsToResults, bulkUpdateAgents } from './crud';
import { createAgentAction } from './actions';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';
import { BulkActionTaskType } from './bulk_actions_resolver';

export class UpgradeActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ items: BulkActionResult[] }> {
    return await upgradeBatch(
      this.soClient,
      this.esClient,
      agents,
      {},
      this.actionParams! as any,
      true
    );
  }

  protected getTaskType() {
    return BulkActionTaskType.UPGRADE_RETRY;
  }

  protected getActionType() {
    return 'UPGRADE';
  }
}

export async function upgradeBatch(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  options: ({ agents: Agent[] } | GetAgentsOptions) & {
    actionId?: string;
    version: string;
    sourceUri?: string | undefined;
    force?: boolean;
    upgradeDurationSeconds?: number;
    startTime?: string;
    total?: number;
  },
  skipSuccess?: boolean
): Promise<{ items: BulkActionResult[] }> {
  const errors: Record<Agent['id'], Error> = { ...outgoingErrors };

  const hostedPolicies = await getHostedPolicies(soClient, givenAgents);

  // results from getAgents with options.kuery '' (or even 'active:false') may include hosted agents
  // filter them out unless options.force
  const agentsToCheckUpgradeable =
    'kuery' in options && !options.force
      ? givenAgents.filter((agent: Agent) => !isHostedAgent(hostedPolicies, agent))
      : givenAgents;

  const kibanaVersion = appContextService.getKibanaVersion();
  const upgradeableResults = await Promise.allSettled(
    agentsToCheckUpgradeable.map(async (agent) => {
      // Filter out agents currently unenrolling, unenrolled, or not upgradeable b/c of version check
      const isNotAllowed =
        !options.force && !isAgentUpgradeable(agent, kibanaVersion, options.version);
      if (isNotAllowed) {
        throw new IngestManagerError(`${agent.id} is not upgradeable`);
      }

      if (!options.force && isHostedAgent(hostedPolicies, agent)) {
        throw new HostedAgentPolicyRestrictionRelatedError(
          `Cannot upgrade agent in hosted agent policy ${agent.policy_id}`
        );
      }
      return agent;
    })
  );

  // Filter & record errors from results
  const agentsToUpdate = upgradeableResults.reduce<Agent[]>((agents, result, index) => {
    if (result.status === 'fulfilled') {
      agents.push(result.value);
    } else {
      const id = givenAgents[index].id;
      errors[id] = result.reason;
    }
    return agents;
  }, []);

  // Create upgrade action for each agent
  const now = new Date().toISOString();
  const data = {
    version: options.version,
    source_uri: options.sourceUri,
  };

  const rollingUpgradeOptions = getRollingUpgradeOptions(
    options?.startTime,
    options.upgradeDurationSeconds
  );

  await createAgentAction(esClient, {
    id: options.actionId,
    created_at: now,
    data,
    ack_data: data,
    type: 'UPGRADE',
    total: options.total,
    agents: agentsToUpdate.map((agent) => agent.id),
    ...rollingUpgradeOptions,
  });

  await bulkUpdateAgents(
    esClient,
    agentsToUpdate.map((agent) => ({
      agentId: agent.id,
      data: {
        upgrade_started_at: now,
        upgrade_status: 'started',
      },
    }))
  );

  return {
    items: errorsToResults(
      givenAgents,
      errors,
      'agentIds' in options ? options.agentIds : undefined,
      skipSuccess
    ),
  };
}

const MINIMUM_EXECUTION_DURATION_SECONDS = 60 * 60 * 2; // 2h

const getRollingUpgradeOptions = (startTime?: string, upgradeDurationSeconds?: number) => {
  const now = new Date().toISOString();
  // Perform a rolling upgrade
  if (upgradeDurationSeconds) {
    return {
      start_time: startTime ?? now,
      minimum_execution_duration: Math.min(
        MINIMUM_EXECUTION_DURATION_SECONDS,
        upgradeDurationSeconds
      ),
      expiration: moment(startTime ?? now)
        .add(upgradeDurationSeconds, 'seconds')
        .toISOString(),
    };
  }
  // Schedule without rolling upgrade (Immediately after start_time)
  if (startTime && !upgradeDurationSeconds) {
    return {
      start_time: startTime ?? now,
      minimum_execution_duration: MINIMUM_EXECUTION_DURATION_SECONDS,
      expiration: moment(startTime)
        .add(MINIMUM_EXECUTION_DURATION_SECONDS, 'seconds')
        .toISOString(),
    };
  } else {
    // Regular bulk upgrade (non scheduled, non rolling)
    return {};
  }
};
