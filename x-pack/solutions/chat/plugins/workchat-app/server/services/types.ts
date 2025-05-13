/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationsService } from './integrations/integrations_service';
import type { AgentFactory } from './orchestration';
import type { ConversationService } from './conversations';
import type { ChatService } from './chat';
import type { AgentService } from './agents';

export interface InternalServices {
  agentFactory: AgentFactory;
  agentService: AgentService;
  chatService: ChatService;
  conversationService: ConversationService;
  integrationsService: IntegrationsService;
}
