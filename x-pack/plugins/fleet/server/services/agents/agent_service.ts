/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';

import type { AgentStatus, ListWithKuery } from '../../types';
import type { Agent, GetAgentStatusResponse } from '../../../common';

import { getAuthzFromRequest } from '../../routes/security';

import { FleetUnauthorizedError } from '../../errors';

import { getAgentsByKuery, getAgentById } from './crud';
import { getAgentStatusById, getAgentStatusForAgentPolicy } from './status';

/**
 * A service for interacting with Agent data. See {@link AgentClient} for more information.
 *
 * @public
 */
export interface AgentService {
  /**
   * Should be used for end-user requests to Kibana. APIs will return errors if user does not have appropriate access.
   */
  asScoped(req: KibanaRequest): AgentClient;

  /**
   * Only use for server-side usages (eg. telemetry), should not be used for end users unless an explicit authz check is
   * done.
   */
  asInternalUser: AgentClient;
}

/**
 * A client for interacting with data about an Agent
 *
 * @public
 */
export interface AgentClient {
  /**
   * Get an Agent by id
   */
  getAgent(agentId: string): Promise<Agent>;

  /**
   * Return the status by the Agent's id
   */
  getAgentStatusById(agentId: string): Promise<AgentStatus>;

  /**
   * Return the status by the Agent's Policy id
   */
  getAgentStatusForAgentPolicy(
    agentPolicyId?: string,
    filterKuery?: string
  ): Promise<GetAgentStatusResponse['results']>;

  /**
   * List agents
   */
  listAgents(
    options: ListWithKuery & {
      showInactive: boolean;
    }
  ): Promise<{
    agents: Agent[];
    total: number;
    page: number;
    perPage: number;
  }>;
}

/**
 * @internal
 */
class AgentClientImpl implements AgentClient {
  constructor(
    private readonly internalEsClient: ElasticsearchClient,
    private readonly preflightCheck?: () => void | Promise<void>
  ) {}

  public async listAgents(
    options: ListWithKuery & {
      showInactive: boolean;
    }
  ) {
    await this.#runPreflight();
    return getAgentsByKuery(this.internalEsClient, options);
  }

  public async getAgent(agentId: string) {
    await this.#runPreflight();
    return getAgentById(this.internalEsClient, agentId);
  }

  public async getAgentStatusById(agentId: string) {
    await this.#runPreflight();
    return getAgentStatusById(this.internalEsClient, agentId);
  }

  public async getAgentStatusForAgentPolicy(agentPolicyId?: string, filterKuery?: string) {
    await this.#runPreflight();
    return getAgentStatusForAgentPolicy(this.internalEsClient, agentPolicyId, filterKuery);
  }

  #runPreflight = async () => {
    if (this.preflightCheck) {
      return this.preflightCheck();
    }
  };
}

/**
 * @internal
 */
export class AgentServiceImpl implements AgentService {
  constructor(private readonly internalEsClient: ElasticsearchClient) {}

  public asScoped(req: KibanaRequest) {
    const preflightCheck = async () => {
      const authz = await getAuthzFromRequest(req);
      if (!authz.fleet.all) {
        throw new FleetUnauthorizedError(
          `User does not have adequate permissions to access Fleet agents.`
        );
      }
    };

    return new AgentClientImpl(this.internalEsClient, preflightCheck);
  }

  public get asInternalUser() {
    return new AgentClientImpl(this.internalEsClient);
  }
}
