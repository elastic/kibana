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
import { createConversationRoute } from './conversation/create_route';
import { deleteConversationRoute } from './conversation/delete_route';
import { findConversationsRoute } from './conversation/find_route';
import { readConversationRoute } from './conversation/read_route';
import { updateConversationRoute } from './conversation/update_route';
import { findUserConversationsRoute } from './conversation/find_user_conversations_route';
import { bulkActionConversationsRoute } from './conversation/bulk_actions_route';
import { readLastConversationRoute } from './conversation/read_last_route';
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
  // Conversation CRUD
  createConversationRoute(router);
  readConversationRoute(router);
  updateConversationRoute(router);
  deleteConversationRoute(router);
  readLastConversationRoute(router);

  // Conversations bulk CRUD
  bulkActionConversationsRoute(router, logger);

  // Capabilities
  getCapabilitiesRoute(router);

  // Conversations search
  findConversationsRoute(router, logger);
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
