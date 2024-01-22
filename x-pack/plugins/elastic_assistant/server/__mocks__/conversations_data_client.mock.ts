/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { AIAssistantConversationsDataClient } from '../conversations_data_client';

type ConversationsDataClientContract = PublicMethodsOf<AIAssistantConversationsDataClient>;
export type ConversationsDataClientMock = jest.Mocked<ConversationsDataClientContract>;

const createConversationsDataClientMock = () => {
  const mocked: ConversationsDataClientMock = {
    findConversations: jest.fn(),
    appendConversationMessages: jest.fn(),
    createConversation: jest.fn(),
    deleteConversation: jest.fn(),
    getConversation: jest.fn(),
    updateConversation: jest.fn(),
    getReader: jest.fn(),
    getWriter: jest.fn().mockResolvedValue({ bulk: jest.fn() }),
  };
  return mocked;
};

export const conversationsDataClientMock: {
  create: () => ConversationsDataClientMock;
} = {
  create: createConversationsDataClientMock,
};
