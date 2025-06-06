/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationClient } from './conversation_client';
import type { ConversationService } from './conversation_service';

const createConversationClientMock = () => {
  const mocked: jest.Mocked<ConversationClient> = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  return mocked;
};

const createConversationServiceMock = () => {
  const mocked: jest.Mocked<ConversationService> = {
    getScopedClient: jest.fn().mockReturnValue(createConversationClientMock()),
  };
  return mocked;
};

export const conversationMocks = {
  create: createConversationServiceMock,
  createClient: createConversationClientMock,
};
