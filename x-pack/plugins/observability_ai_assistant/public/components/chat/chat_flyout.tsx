/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlyout } from '@elastic/eui';
import React from 'react';
import type { ConversationCreateRequest } from '../../../common/types';
import { useChat } from '../../hooks/use_chat';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { ChatBody } from './chat_body';

export function ChatFlyout({
  initialConversation,
  isOpen,
  onClose,
}: {
  initialConversation: ConversationCreateRequest;
  isOpen: boolean;
  onClose: () => void;
}) {
  const chat = useChat();

  const connectors = useGenAIConnectors();

  const currentUser = useCurrentUser();

  return isOpen ? (
    <EuiFlyout onClose={onClose}>
      <ChatBody
        chat={chat}
        connectors={connectors}
        initialConversation={initialConversation}
        currentUser={currentUser}
      />
    </EuiFlyout>
  ) : null;
}
