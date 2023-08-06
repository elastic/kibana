/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useConversation } from '../../hooks/use_conversation';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';
import { AssistantAvatar } from '../assistant_avatar';
import { ChatFlyout } from '../chat/chat_flyout';

export function ObservabilityAIAssistantActionMenuItem() {
  const service = useObservabilityAIAssistant();

  const [conversationId, setConversationId] = useState<string>();

  const { conversation, displayedMessages, setDisplayedMessages, save } =
    useConversation(conversationId);

  const [isOpen, setIsOpen] = useState(false);

  if (!service.isEnabled()) {
    return null;
  }

  return (
    <>
      <EuiHeaderLink
        color="primary"
        onClick={() => {
          setIsOpen(() => true);
        }}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <AssistantAvatar size="xs" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.observabilityAiAssistant.actionMenuItemLabel', {
              defaultMessage: 'AI Assistant',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiHeaderLink>
      <ChatFlyout
        isOpen={isOpen}
        title={conversation.value?.conversation.title ?? EMPTY_CONVERSATION_TITLE}
        messages={displayedMessages}
        conversationId={conversationId}
        onClose={() => {
          setIsOpen(() => false);
        }}
        onChatComplete={(messages) => {
          save(messages)
            .then((nextConversation) => {
              setConversationId(nextConversation.conversation.id);
            })
            .catch(() => {});
        }}
        onChatUpdate={(nextMessages) => {
          setDisplayedMessages(nextMessages);
        }}
      />
    </>
  );
}
