/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComment, EuiPanel, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentRef } from '@kbn/wci-common';
import type { AuthenticatedUser } from '@kbn/core/public';
import { ChatMessageText } from './chat_message_text';
import { ChatMessageAvatar } from './chat_message_avatar';
import {
  type UserMessageConversationItem,
  type AssistantMessageConversationItem,
  isUserMessageItem,
  isAssistantMessageItem,
} from '../../utils/conversation_items';

type UserOrAssistantMessageItem = UserMessageConversationItem | AssistantMessageConversationItem;

interface ChatConversationMessageProps {
  message: UserOrAssistantMessageItem;
  currentUser: AuthenticatedUser | undefined;
}

const getUserLabel = (item: UserOrAssistantMessageItem) => {
  if (isUserMessageItem(item)) {
    return i18n.translate('xpack.workchatApp.chat.messages.userLabel', {
      defaultMessage: 'You',
    });
  }
  return i18n.translate('xpack.workchatApp.chat.messages.assistantLabel', {
    defaultMessage: 'WorkChat',
  });
};

export const ChatConversationMessage: React.FC<ChatConversationMessageProps> = ({
  message,
  currentUser,
}) => {
  const userMessage = useMemo(() => {
    return isUserMessageItem(message);
  }, [message]);

  const messageContent = useMemo(() => {
    return message.message.content;
  }, [message]);

  const citations = isAssistantMessageItem(message) ? message.message.citations : [];

  return (
    <EuiComment
      username={getUserLabel(message)}
      timelineAvatar={
        <ChatMessageAvatar
          eventType={userMessage ? 'user' : 'assistant'}
          loading={message.loading}
          currentUser={currentUser}
        />
      }
      event=""
      eventColor={userMessage ? 'primary' : 'subdued'}
      actions={<></>}
    >
      <EuiPanel hasShadow={false} paddingSize="s">
        <ChatMessageText content={messageContent} loading={message.loading} />
        {citations.length > 0 && (
          <>
            <EuiSpacer />
            <ChatMessageCitations citations={citations} />
          </>
        )}
      </EuiPanel>
    </EuiComment>
  );
};

export const ChatMessageCitations: React.FC<{ citations: ContentRef[] }> = ({ citations }) => {
  const renderCitation = (citation: ContentRef) => {
    return (
      <EuiFlexItem grow={false}>
        <EuiPanel hasShadow={false} hasBorder={true} paddingSize="s">
          <EuiText size="s">Document</EuiText>
          <EuiText size="s" color="subdued">
            ID: {citation.contentId}
          </EuiText>
          <EuiText size="s" color="subdued">
            Integration: {citation.sourceId}
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    );
  };

  return (
    <EuiPanel hasShadow={false} hasBorder={true} paddingSize="s" grow={false}>
      <EuiText>Sources</EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup>{citations.map(renderCitation)}</EuiFlexGroup>
    </EuiPanel>
  );
};
