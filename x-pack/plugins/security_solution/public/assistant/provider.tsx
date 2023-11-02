/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../common/lib/kibana';

import { AssistantConversationsProvider } from './wrapper';

/**
 * This component configures the Elastic AI Assistant context provider for the Security Solution app.
 */
export const AssistantProvider: React.FC = ({ children }) => {
  const { assistantBaseConversations: assistantBaseConversationsObject } = useKibana().services;
  const assistantBaseConversations$ =
    assistantBaseConversationsObject.getAssistantBaseConversations();
  const assistantBaseConversations = useObservable(assistantBaseConversations$, null);
  const isValidConversationId = useCallback(
    (conversationId) => assistantBaseConversationsObject.isValidConversationId(conversationId),
    [assistantBaseConversationsObject]
  );

  return assistantBaseConversations ? (
    <AssistantConversationsProvider
      assistantBaseConversations={assistantBaseConversations}
      isValidConversationId={isValidConversationId}
    >
      {children}
    </AssistantConversationsProvider>
  ) : null;
};
