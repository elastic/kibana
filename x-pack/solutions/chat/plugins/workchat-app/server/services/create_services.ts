/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { LoggerFactory } from '@kbn/core/server';
import type { WorkChatAppPluginStartDependencies } from '../types';
import type { WorkChatAppConfig } from '../config';
import type { InternalServices } from './types';
import { IntegrationsServiceImpl } from './integrations/integrations_service';
import { ConversationServiceImpl } from './conversations';
import { ChatService } from './chat';
import { AgentFactory } from './orchestration';
import { AgentServiceImpl } from './agents';
import { IntegrationRegistry } from './integrations';

interface CreateServicesParams {
  core: CoreStart;
  config: WorkChatAppConfig;
  loggerFactory: LoggerFactory;
  pluginsDependencies: WorkChatAppPluginStartDependencies;
  integrationRegistry: IntegrationRegistry;
}

export function createServices({
  core,
  config,
  loggerFactory,
  pluginsDependencies,
  integrationRegistry,
}: CreateServicesParams): InternalServices {
  integrationRegistry.blockRegistration();

  const integrationsService = new IntegrationsServiceImpl({
    logger: loggerFactory.get('services.integrations'),
    elasticsearch: core.elasticsearch,
    registry: integrationRegistry,
    savedObjects: core.savedObjects,
    security: core.security,
  });

  const conversationService = new ConversationServiceImpl({
    savedObjects: core.savedObjects,
    security: core.security,
    logger: loggerFactory.get('services.conversations'),
  });

  const agentService = new AgentServiceImpl({
    savedObjects: core.savedObjects,
    security: core.security,
    logger: loggerFactory.get('services.agent'),
  });

  const agentFactory = new AgentFactory({
    inference: pluginsDependencies.inference,
    tracingConfig: config.tracing,
    logger: loggerFactory.get('services.agentFactory'),
    agentService,
    integrationsService,
  });

  const chatService = new ChatService({
    inference: pluginsDependencies.inference,
    logger: loggerFactory.get('services.chat'),
    agentFactory,
    conversationService,
  });

  return {
    conversationService,
    agentService,
    agentFactory,
    integrationsService,
    chatService,
  };
}
