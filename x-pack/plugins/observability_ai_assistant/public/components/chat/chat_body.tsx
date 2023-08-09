/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import React from 'react';
import type { Message } from '../../../common/types';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { useTimeline } from '../../hooks/use_timeline';
import { ObservabilityAIAssistantService } from '../../types';
import { HideExpandConversationListButton } from '../buttons/hide_expand_conversation_list_button';
import { MissingCredentialsCallout } from '../missing_credentials_callout';
import { ChatHeader } from './chat_header';
import { ChatPromptEditor } from './chat_prompt_editor';
import { ChatTimeline } from './chat_timeline';

const containerClassName = css`
  max-height: 100%;
`;

const timelineClassName = css`
  overflow-y: auto;
`;

const loadingSpinnerContainerClassName = css`
  align-self: center;
`;

export function ChatBody({
  title,
  messages,
  connectors,
  currentUser,
  service,
  connectorsManagementHref,
  isConversationListExpanded,
  onToggleExpandConversationList,
  onChatUpdate,
  onChatComplete,
}: {
  title: string;
  messages: Message[];
  connectors: UseGenAIConnectorsResult;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  service: ObservabilityAIAssistantService;
  connectorsManagementHref: string;
  isConversationListExpanded?: boolean;
  onToggleExpandConversationList?: () => void;
  onChatUpdate: (messages: Message[]) => void;
  onChatComplete: (messages: Message[]) => void;
}) {
  const { euiTheme } = useEuiTheme();

  const timeline = useTimeline({
    messages,
    connectors,
    currentUser,
    service,
    onChatUpdate,
    onChatComplete,
  });

  let footer: React.ReactNode;

  if (connectors.loading || connectors.connectors?.length === 0) {
    footer = (
      <>
        <EuiSpacer size="l" />
        {connectors.connectors?.length === 0 ? (
          <MissingCredentialsCallout connectorsManagementHref={connectorsManagementHref} />
        ) : (
          <EuiFlexItem className={loadingSpinnerContainerClassName}>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        )}
      </>
    );
  } else {
    footer = (
      <>
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
              loading={false}
              disabled={!connectors.selectedConnector}
              onSubmit={timeline.onSubmit}
            />
          </EuiPanel>
        </EuiFlexItem>
      </>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none" className={containerClassName}>
      <EuiFlexItem grow={false}>
        {onToggleExpandConversationList ? (
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
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
          <ChatHeader title={title} connectors={connectors} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      {footer}
    </EuiFlexGroup>
  );
}
