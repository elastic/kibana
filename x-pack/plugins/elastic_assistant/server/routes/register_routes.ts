/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { once } from 'lodash/fp';
import {
  ElasticAssistantPluginRouter,
  ElasticAssistantPluginSetupDependencies,
  GetElser,
} from '../types';
import { createConversationRoute } from './user_conversations/create_route';
import { deleteConversationRoute } from './user_conversations/delete_route';
import { readConversationRoute } from './user_conversations/read_route';
import { updateConversationRoute } from './user_conversations/update_route';
import { findUserConversationsRoute } from './user_conversations/find_user_conversations_route';
import { bulkActionConversationsRoute } from './user_conversations/bulk_actions_route';
import { appendConversationMessageRoute } from './user_conversations/append_conversation_messages_route';
import { deleteKnowledgeBaseRoute } from './knowledge_base/delete_knowledge_base';
import { getKnowledgeBaseStatusRoute } from './knowledge_base/get_knowledge_base_status';
import { postKnowledgeBaseRoute } from './knowledge_base/post_knowledge_base';
import { postEvaluateRoute } from './evaluate/post_evaluate';
import { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';
import { getCapabilitiesRoute } from './capabilities/get_capabilities_route';
import { createPromptRoute } from './prompts/create_route';
import { updatePromptRoute } from './prompts/update_route';
import { deletePromptRoute } from './prompts/delete_route';
import { findPromptsRoute } from './prompts/find_route';

export const registerRoutes = (
  router: ElasticAssistantPluginRouter,
  logger: Logger,
  plugins: ElasticAssistantPluginSetupDependencies
) => {
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

  // Knowledge Base
  deleteKnowledgeBaseRoute(router);
  const getElserId: GetElser = once(
    async (request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) => {
      return (await plugins.ml.trainedModelsProvider(request, savedObjectsClient).getELSER())
        .model_id;
    }
  );
  getKnowledgeBaseStatusRoute(router, getElserId);
  postKnowledgeBaseRoute(router, getElserId);

  // Actions Connector Execute (LLM Wrapper)
  postActionsConnectorExecuteRoute(router, getElserId);

  // Evaluate
  postEvaluateRoute(router, getElserId);

  // Prompts
  createPromptRoute(router);
  findPromptsRoute(router, logger);
  updatePromptRoute(router);
  deletePromptRoute(router);
};
