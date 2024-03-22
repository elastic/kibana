/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { once } from 'lodash/fp';
import { firstValueFrom } from 'rxjs';
import {
  ElasticAssistantPluginCoreSetupDependencies,
  ElasticAssistantPluginRouter,
  GetElser,
} from '../types';
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
import { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';
import { getCapabilitiesRoute } from './capabilities/get_capabilities_route';
import { bulkPromptsRoute } from './prompts/bulk_actions_route';
import { findPromptsRoute } from './prompts/find_route';
import { bulkActionAnonymizationFieldsRoute } from './anonymization_fields/bulk_actions_route';
import { findAnonymizationFieldsRoute } from './anonymization_fields/find_route';

export const registerRoutes = (
  router: ElasticAssistantPluginRouter,
  logger: Logger,
  core: ElasticAssistantPluginCoreSetupDependencies
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
      try {
        // Wait for the ML plugin's dependency on the internal saved objects client to be ready
        const [_, pluginsStart] = await core.getStartServices();

        const { ml } = await core.plugins.onSetup('ml');

        if (!ml.found) {
          throw new Error('Could not find ML plugin');
        }
        // Wait for the license to be available so the ML plugin's guards pass once we ask for ELSER stats
        await firstValueFrom(pluginsStart.licensing.license$);
        return (
          await (
            ml.contract as {
              trainedModelsProvider: (
                request: {},
                soClient: {}
              ) => { getELSER: () => Promise<{ model_id: string }> };
            }
          )
            .trainedModelsProvider(request, savedObjectsClient)
            .getELSER()
        ).model_id;
      } catch (error) {
        logger.error(`Failed to resolve ELSER model definition: ${error}`);

        // Fallback to ELSER v2
        return '.elser_model_2';
      }
    }
  );
  getKnowledgeBaseStatusRoute(router, getElserId);
  postKnowledgeBaseRoute(router, getElserId);

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
};
