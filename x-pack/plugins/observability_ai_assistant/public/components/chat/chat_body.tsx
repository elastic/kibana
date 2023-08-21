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
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import React from 'react';
import type { Message } from '../../../common/types';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import { useTimeline } from '../../hooks/use_timeline';
import { useObservabilityAIAssistantChatService } from '../../hooks/use_observability_ai_assistant_chat_service';
import { MissingCredentialsCallout } from '../missing_credentials_callout';
import { ChatHeader } from './chat_header';
import { ChatPromptEditor } from './chat_prompt_editor';
import { ChatTimeline } from './chat_timeline';
import { KnowledgeBaseCallout } from './knowledge_base_callout';

const containerClassName = css`
  max-height: 100%;
  max-width: 100%;
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
  knowledgeBase,
  currentUser,
  connectorsManagementHref,
  onChatUpdate,
  onChatComplete,
}: {
  title: string;
  messages: Message[];
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  connectorsManagementHref: string;
  onChatUpdate: (messages: Message[]) => void;
  onChatComplete: (messages: Message[]) => void;
}) {
  const chatService = useObservabilityAIAssistantChatService();

  const timeline = useTimeline({
    messages,
    connectors,
    currentUser,
    chatService,
    onChatUpdate,
    onChatComplete,
  });

  let footer: React.ReactNode;

  if (connectors.loading || knowledgeBase.status.loading) {
    footer = (
      <EuiFlexItem className={loadingSpinnerContainerClassName}>
        <EuiLoadingSpinner />
      </EuiFlexItem>
    );
  } else if (connectors.connectors?.length === 0) {
    footer = (
      <>
        <EuiSpacer size="l" />
        <MissingCredentialsCallout connectorsManagementHref={connectorsManagementHref} />
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
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
          <ChatHeader title={title} connectors={connectors} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <KnowledgeBaseCallout knowledgeBase={knowledgeBase} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      {footer}
    </EuiFlexGroup>
  );
}
