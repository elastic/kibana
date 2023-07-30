/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { ChatBody } from '../../components/chat/chat_body';
import { useChat } from '../../hooks/use_chat';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';

export function ConversationView() {
  const connectors = useGenAIConnectors();
  const chat = useChat();

  const currentUser = useCurrentUser();

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={false} />
      <EuiFlexItem grow>
        <ChatBody
          chat={chat}
          currentUser={currentUser}
          connectors={connectors}
          initialConversation={undefined}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
