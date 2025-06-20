/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkChatTracingConfig } from '../../config';
import { IntegrationsServiceImpl } from '../integrations/integrations_service';
import type { AgentService } from '../agents';
import type { AgentRunner } from './types';
import { createAgentRunner } from './agent_runner';
import { McpGatewaySession, McpGatewaySessionImpl } from './mcp_gateway';
import { getBaseToolProvider } from './base_tools';

interface AgentFactoryArgs {
  logger: Logger;
  inference: InferenceServerStart;
  agentService: AgentService;
  integrationsService: IntegrationsServiceImpl;
  tracingConfig: WorkChatTracingConfig;
}

export class AgentFactory {
  private readonly inference: InferenceServerStart;
  private readonly logger: Logger;
  private readonly agentService: AgentService;
  private readonly integrationsService: IntegrationsServiceImpl;
  private readonly tracingConfig: WorkChatTracingConfig;

  constructor({
    inference,
    logger,
    integrationsService,
    agentService,
    tracingConfig,
  }: AgentFactoryArgs) {
    this.inference = inference;
    this.logger = logger;
    this.integrationsService = integrationsService;
    this.agentService = agentService;
    this.tracingConfig = tracingConfig;
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

    const createSession = async () => {
      return await this.createGatewaySession({
        request,
      });
    };

    const agentClient = await this.agentService.getScopedClient({ request });

    const agent = await agentClient.get({ agentId });

    const chatModel = await this.inference.getChatModel({
      request,
      connectorId,
      chatModelOptions: {},
    });

    return await createAgentRunner({
      agent,
      chatModel,
      createSession,
      logger: this.logger.get('runner'),
      tracingConfig: this.tracingConfig,
    });
  }

  private async createGatewaySession({
    request,
  }: {
    request: KibanaRequest;
  }): Promise<McpGatewaySession> {
    const integrationProviders = await this.integrationsService.getIntegrationProviders({
      integrationIds: '*',
      request,
    });
    const additionalProviders = [await getBaseToolProvider()];
    return new McpGatewaySessionImpl({
      providers: [...integrationProviders, ...additionalProviders],
      logger: this.logger.get('session'),
    });
  }
}
