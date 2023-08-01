/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiListGroup, EuiListGroupItem, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import { NewChatButton } from '../buttons/new_chat_button';
import { useConversations } from '../../hooks/use_conversations';
import { type ConversationCreateRequest } from '../../../common/types';

const containerClassName = css`
  height: 100%;
`;

export function ConversationList({
  selectedConversation,
  onClickNewChat,
  onClickConversation,
}: {
  selectedConversation?: ConversationCreateRequest;
  onClickConversation: (conversationId: string) => void;
  onClickNewChat: () => void;
  onClickSettings: () => void;
}) {
  const conversations = useConversations();

  return (
    <EuiPanel paddingSize="s" hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="none" className={containerClassName}>
        <EuiFlexItem grow>
          <EuiListGroup flush gutterSize="none">
            <EuiListGroupItem
              css={{ textTransform: 'uppercase' }}
              label={<strong>Last 7 days</strong>}
              size="s"
            />

            {conversations.map((conversation) => (
              <EuiListGroupItem
                label={conversation.conversation.title}
                size="s"
                onClick={() => onClickConversation(conversation.conversation.id)}
              />
            ))}
          </EuiListGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow>
                <NewChatButton onClick={onClickNewChat} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
