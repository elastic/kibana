/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatService } from './chat/chat_service';
import type { ConversationService } from './conversation/conversation_service';
import type { AgentService } from './agent/agent_service';
import type { IntegrationService } from './integration/integration_service';
import type { IntegrationRegistry } from './integration/integration_registry';

export interface WorkChatServices {
  chatService: ChatService;
  conversationService: ConversationService;
  agentService: AgentService;
  integrationService: IntegrationService;
  integrationRegistry: IntegrationRegistry;
}
