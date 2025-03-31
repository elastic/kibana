/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { InferenceServerStart } from '@kbn/inference-plugin/server';
import { IntegrationsServiceImpl } from '../integrations/integrations_service';
import type { AgentService } from '../agents';
import type { AgentRunner } from './types';
import { createAgentRunner } from './agent_runner';

interface AgentFactoryArgs {
  logger: Logger;
  inference: InferenceServerStart;
  agentService: AgentService;
  integrationsService: IntegrationsServiceImpl;
}

export class AgentFactory {
  private readonly inference: InferenceServerStart;
  private readonly logger: Logger;
  private readonly agentService: AgentService;
  private readonly integrationsService: IntegrationsServiceImpl;

  constructor({ inference, logger, integrationsService, agentService }: AgentFactoryArgs) {
    this.inference = inference;
    this.logger = logger;
    this.integrationsService = integrationsService;
    this.agentService = agentService;
  }

  async getAgentRunner({
    request,
    connectorId,
    agentId,
  }: {
    agentId: string;
    request: KibanaRequest;
    connectorId: string;
  }): Promise<AgentRunner> {
    this.logger.debug(`getAgent [agentId=${agentId}] [connectorId=${connectorId}]`);

    const integrationsSession = await this.integrationsService.createSession({
      request,
    });

    const agentClient = await this.agentService.getScopedClient({ request });

    const agent = await agentClient.get({ agentId });

    const chatModel = await this.inference.getChatModel({
      request,
      connectorId,
      chatModelOptions: {},
    });

    return await createAgentRunner({ agent, chatModel, integrationsSession, logger: this.logger });
  }
}
