/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyout, useEuiTheme } from '@elastic/eui';
import type { ConversationCreateRequest } from '../../../common/types';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { ChatBody } from './chat_body';
import { ConversationList } from './conversation_list';

export function ChatFlyout({
  initialConversation,
  isOpen,
  onClose,
}: {
  initialConversation: ConversationCreateRequest;
  isOpen: boolean;
  onClose: () => void;
}) {
  const connectors = useGenAIConnectors();

  const currentUser = useCurrentUser();

  const { euiTheme } = useEuiTheme();

  const [isConversationListExpanded, setIsConversationListExpanded] = useState(false);

  const handleClickConversation = (id: string) => {};
  const handleClickNewChat = () => {};
  const handleClickSettings = () => {};

  const service = useObservabilityAIAssistant();

  return isOpen ? (
    <EuiFlyout onClose={onClose}>
      <EuiFlexGroup responsive={false} gutterSize="none">
        {isConversationListExpanded ? (
          <EuiFlexItem
            grow={false}
            css={{ minWidth: 200, borderRight: `solid 1px ${euiTheme.border.color}` }}
          >
            <ConversationList
              onClickConversation={handleClickConversation}
              onClickNewChat={handleClickNewChat}
              onClickSettings={handleClickSettings}
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <ChatBody
            service={service}
            connectors={connectors}
            initialConversation={initialConversation}
            currentUser={currentUser}
            isConversationListExpanded={isConversationListExpanded}
            onToggleExpandConversationList={() =>
              setIsConversationListExpanded(!isConversationListExpanded)
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyout>
  ) : null;
}
