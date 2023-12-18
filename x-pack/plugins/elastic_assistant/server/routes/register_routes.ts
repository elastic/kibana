/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { ElasticAssistantPluginRouter } from '../types';
import { createConversationRoute } from './conversation/create_route';
import { deleteConversationRoute } from './conversation/delete_route';
import { findConversationsRoute } from './conversation/find_route';
import { readConversationRoute } from './conversation/read_route';
import { updateConversationRoute } from './conversation/update_route';
import { findUserConversationsRoute } from './conversation/find_user_conversations_route';
import { bulkActionConversationsRoute } from './conversation/bulk_actions_route';

export const registerConversationsRoutes = (
  router: ElasticAssistantPluginRouter,
  logger: Logger
) => {
  // Conversation CRUD
  createConversationRoute(router);
  readConversationRoute(router);
  updateConversationRoute(router);
  deleteConversationRoute(router);

  // Conversations bulk CRUD
  bulkActionConversationsRoute(router, logger);

  // Conversations search
  findConversationsRoute(router, logger);
  findUserConversationsRoute(router);
};
