/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import React from 'react';
import { type ConversationCreateRequest } from '../../../common/types';
import type { UseChatResult } from '../../hooks/use_chat';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { useTimeline } from '../../hooks/use_timeline';
import { HideExpandConversationListButton } from '../buttons/hide_expand_conversation_list_button';
import { ChatHeader } from './chat_header';
import { ChatPromptEditor } from './chat_prompt_editor';
import { ChatTimeline } from './chat_timeline';

const containerClassName = css`
  max-height: 100%;
`;

const timelineClassName = css`
  overflow-y: auto;
`;

export function ChatBody({
  initialConversation,
  connectors,
  currentUser,
  chat,
  isConversationListExpanded,
  onToggleExpandConversationList,
}: {
  initialConversation?: ConversationCreateRequest;
  connectors: UseGenAIConnectorsResult;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  chat: UseChatResult;
  isConversationListExpanded?: boolean;
  onToggleExpandConversationList?: () => void;
}) {
  const { euiTheme } = useEuiTheme();

  const timeline = useTimeline({
    initialConversation,
    connectors,
    currentUser,
    chat,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="none" className={containerClassName}>
      <EuiFlexItem grow={false}>
        <EuiPanel
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          css={{ borderBottom: `solid 1px ${euiTheme.border.color}` }}
        >
          <HideExpandConversationListButton
            isExpanded={Boolean(isConversationListExpanded)}
            onClick={onToggleExpandConversationList}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
          <ChatHeader
            title={initialConversation?.conversation.title ?? ''}
            connectors={connectors}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow className={timelineClassName}>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
          <ChatTimeline
            items={timeline.items}
            onEdit={timeline.onEdit}
            onFeedback={timeline.onFeedback}
            onRegenerate={timeline.onRegenerate}
            onStopGenerating={timeline.onStopGenerating}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
          <ChatPromptEditor
            loading={chat.loading}
            disabled={!connectors.selectedConnector}
            onSubmit={timeline.onSubmit}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
