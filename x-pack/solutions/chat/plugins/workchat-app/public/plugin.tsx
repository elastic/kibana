/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type {
  WorkChatAppPluginSetup,
  WorkChatAppPluginStart,
  WorkChatAppPluginSetupDependencies,
  WorkChatAppPluginStartDependencies,
} from './types';
import { registerApp } from './application';
import { ChatService, ConversationService, AgentService, type WorkChatServices } from './services';
import { IntegrationService } from './services/integration/integration_service';
import { IntegrationRegistry } from './services/integration/integration_registry';
import { WorkspaceDataType, DocumentDataType } from './data_types';

export class WorkChatAppPlugin
  implements
    Plugin<
      WorkChatAppPluginSetup,
      WorkChatAppPluginStart,
      WorkChatAppPluginSetupDependencies,
      WorkChatAppPluginStartDependencies
    >
{
  private services?: WorkChatServices;
  private readonly integrationRegistry = new IntegrationRegistry();
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get('workchat.app.public');
  }

  public setup(
    core: CoreSetup<WorkChatAppPluginStartDependencies, WorkChatAppPluginStart>,
    { chatDataRegistry }: WorkChatAppPluginSetupDependencies
  ): WorkChatAppPluginSetup {
    registerApp({
      core,
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before plugin start');
        }
        return this.services;
      },
    });

    // Register custom data type descriptors
    // chatDataRegistry.dataTypeRegistry.register(new WorkspaceDataType());
    // chatDataRegistry.dataTypeRegistry.register(new DocumentDataType());

    return {
      integrations: {
        register: (integrationComponents) => {
          this.integrationRegistry.register(integrationComponents);
        },
      },
    };
  }

  public start(
    { http }: CoreStart,
    pluginsStart: WorkChatAppPluginStartDependencies
  ): WorkChatAppPluginStart {
    const conversationService = new ConversationService({
      http,
    });
    const chatService = new ChatService({
      http,
    });
    const agentService = new AgentService({
      http,
    });
    const integrationService = new IntegrationService({
      http,
    });

    this.services = {
      chatService,
      agentService,
      conversationService,
      integrationService,
      integrationRegistry: this.integrationRegistry,
    };

    this.logger.info('WorkChatAppPlugin started.');
    return {};
  }

  public stop() {}
}
