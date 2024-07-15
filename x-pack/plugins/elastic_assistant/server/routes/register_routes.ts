/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { cancelAttackDiscoveryRoute } from './attack_discovery/cancel_attack_discovery';
import { getAttackDiscoveryRoute } from './attack_discovery/get_attack_discovery';
import { postAttackDiscoveryRoute } from './attack_discovery/post_attack_discovery';
import { ElasticAssistantPluginRouter, GetElser } from '../types';
import { createConversationRoute } from './user_conversations/create_route';
import { deleteConversationRoute } from './user_conversations/delete_route';
import { readConversationRoute } from './user_conversations/read_route';
import { updateConversationRoute } from './user_conversations/update_route';
import { findUserConversationsRoute } from './user_conversations/find_route';
import { bulkActionConversationsRoute } from './user_conversations/bulk_actions_route';
import { appendConversationMessageRoute } from './user_conversations/append_conversation_messages_route';
import { deleteKnowledgeBaseRoute } from './knowledge_base/delete_knowledge_base';
import { getKnowledgeBaseStatusRoute } from './knowledge_base/get_knowledge_base_status';
import { postKnowledgeBaseRoute } from './knowledge_base/post_knowledge_base';
import { getEvaluateRoute } from './evaluate/get_evaluate';
import { postEvaluateRoute } from './evaluate/post_evaluate';
import { getCapabilitiesRoute } from './capabilities/get_capabilities_route';
import { bulkPromptsRoute } from './prompts/bulk_actions_route';
import { findPromptsRoute } from './prompts/find_route';
import { bulkActionAnonymizationFieldsRoute } from './anonymization_fields/bulk_actions_route';
import { findAnonymizationFieldsRoute } from './anonymization_fields/find_route';
import { chatCompleteRoute } from './chat/chat_complete_route';
import { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';
import { bulkActionKnowledgeBaseEntriesRoute } from './knowledge_base/entries/bulk_actions_route';
import { createKnowledgeBaseEntryRoute } from './knowledge_base/entries/create_route';
import { findKnowledgeBaseEntriesRoute } from './knowledge_base/entries/find_route';

export const registerRoutes = (
  router: ElasticAssistantPluginRouter,
  logger: Logger,
  getElserId: GetElser
) => {
  /** PUBLIC */
  // Chat
  chatCompleteRoute(router, getElserId);

  /** INTERNAL */
  // Capabilities
  getCapabilitiesRoute(router);

  // User Conversations CRUD
  createConversationRoute(router);
  readConversationRoute(router);
  updateConversationRoute(router);
  deleteConversationRoute(router);
  appendConversationMessageRoute(router);

  // User Conversations bulk CRUD
  bulkActionConversationsRoute(router, logger);

  // User Conversations search
  findUserConversationsRoute(router);

  // Knowledge Base Setup
  deleteKnowledgeBaseRoute(router);
  getKnowledgeBaseStatusRoute(router, getElserId);
  postKnowledgeBaseRoute(router, getElserId);

  // Knowledge Base Entries
  findKnowledgeBaseEntriesRoute(router);
  createKnowledgeBaseEntryRoute(router);
  bulkActionKnowledgeBaseEntriesRoute(router);

  // Actions Connector Execute (LLM Wrapper)
  postActionsConnectorExecuteRoute(router, getElserId);

  // Evaluate
  getEvaluateRoute(router);
  postEvaluateRoute(router, getElserId);

  // Prompts
  bulkPromptsRoute(router, logger);
  findPromptsRoute(router, logger);

  // Anonymization Fields
  bulkActionAnonymizationFieldsRoute(router, logger);
  findAnonymizationFieldsRoute(router, logger);

  // Attack Discovery
  getAttackDiscoveryRoute(router);
  postAttackDiscoveryRoute(router);
  cancelAttackDiscoveryRoute(router);
};
