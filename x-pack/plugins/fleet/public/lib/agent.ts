/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Agent } from '../../common/types/domain_data';
import { AgentAdapter } from './adapters/agent/memory_agent_adapter';
import { ElasticsearchLib } from './elasticsearch';

export class AgentsLib {
  constructor(
    private readonly adapter: AgentAdapter,
    private readonly elasticsearch: ElasticsearchLib
  ) {}

  /** Get a single beat using it's ID for lookup */
  public async get(id: string): Promise<Agent | null> {
    const agent = await this.adapter.get(id);
    return agent;
  }

  /** Get a single agent using the token it was enrolled in for lookup */
  public getWithToken = async (enrollmentToken: string): Promise<Agent | null> => {
    const agent = await this.adapter.getWithToken(enrollmentToken);
    return agent;
  };

  /** Get an array of agents that have a given tag id assigned to it */
  public getOnConfig = async (configId: string): Promise<Agent[]> => {
    const agents = await this.adapter.getOnConfig(configId);
    return agents;
  };

  // FIXME: This needs to be paginated https://github.com/elastic/kibana/issues/26022
  /** Get an array of all enrolled agents. */
  public getAll = async (kuery?: string): Promise<Agent[]> => {
    let ESQuery;
    if (kuery) {
      ESQuery = await this.elasticsearch.convertKueryToEsQuery(kuery);
    }
    const agents = await this.adapter.getAll(ESQuery);
    return agents;
  };

  /** Update a given agent via it's ID */
  public update = async (id: string, agentData: Partial<Agent>): Promise<boolean> => {
    return await this.adapter.update(id, agentData);
  };
}
