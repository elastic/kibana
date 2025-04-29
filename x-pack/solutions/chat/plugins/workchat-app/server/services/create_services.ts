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
  logger: LoggerFactory;
  pluginsDependencies: WorkChatAppPluginStartDependencies;
  integrationRegistry: IntegrationRegistry;
}

export function createServices({
  core,
  config,
  logger,
  pluginsDependencies,
  integrationRegistry,
}: CreateServicesParams): InternalServices {
  integrationRegistry.blockRegistration();

  const integrationsService = new IntegrationsServiceImpl({
    logger: logger.get('services.integrations'),
    elasticsearch: core.elasticsearch,
    registry: integrationRegistry,
    savedObjects: core.savedObjects,
    security: core.security,
  });

  const conversationService = new ConversationServiceImpl({
    savedObjects: core.savedObjects,
    security: core.security,
    logger: logger.get('services.conversations'),
  });

  const agentService = new AgentServiceImpl({
    savedObjects: core.savedObjects,
    security: core.security,
    logger: logger.get('services.agent'),
  });

  const agentFactory = new AgentFactory({
    inference: pluginsDependencies.inference,
    tracingConfig: config.tracing,
    logger: logger.get('services.agentFactory'),
    agentService,
    integrationsService,
  });

  const chatService = new ChatService({
    inference: pluginsDependencies.inference,
    logger: logger.get('services.chat'),
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
