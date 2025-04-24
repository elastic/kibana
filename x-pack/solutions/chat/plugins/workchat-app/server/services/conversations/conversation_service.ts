/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsServiceStart,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import { conversationTypeName } from '../../saved_objects/conversations';
import { ConversationClientImpl, ConversationClient } from './conversation_client';

interface ConversationServiceOptions {
  logger: Logger;
  savedObjects: SavedObjectsServiceStart;
  security: SecurityServiceStart;
}

export interface ConversationService {
  /**
   * Returns a conversation client scoped to the current user.
   */
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationClient>;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly savedObjects: SavedObjectsServiceStart;
  private readonly security: SecurityServiceStart;
  private readonly logger: Logger;

  constructor({ savedObjects, security, logger }: ConversationServiceOptions) {
    this.savedObjects = savedObjects;
    this.security = security;
    this.logger = logger;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ConversationClient> {
    const user = this.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('No user bound to the provided request');
    }
    const soClient = this.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [conversationTypeName],
    });

    return new ConversationClientImpl({
      logger: this.logger.get('client'),
      client: soClient,
      user: { id: user.profile_uid!, username: user.username },
    });
  }
}
