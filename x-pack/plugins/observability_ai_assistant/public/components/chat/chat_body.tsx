/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { last } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { Message } from '../../../common/types';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import { useTimeline } from '../../hooks/use_timeline';
import { useLicenseContext } from '../../context/license/use_license_context';
import { useObservabilityAIAssistantChatService } from '../../hooks/use_observability_ai_assistant_chat_service';
import { MissingCredentialsCallout } from '../missing_credentials_callout';
import { ExperimentalFeatureBanner } from './experimental_feature_banner';
import { IncorrectLicensePanel } from './incorrect_license_panel';
import { ChatHeader } from './chat_header';
import { ChatPromptEditor } from './chat_prompt_editor';
import { ChatTimeline } from './chat_timeline';

const containerClassName = css`
  max-height: 100%;
  max-width: ${1200 - 250}px; // page template max width - conversation list width.
`;

const timelineClassName = css`
  overflow-y: auto;
`;

const loadingSpinnerContainerClassName = css`
  align-self: center;
`;

const incorrectLicenseContainer = css`
  height: 100%;
  padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingMedium};
`;

export function ChatBody({
  title,
  loading,
  messages,
  connectors,
  knowledgeBase,
  connectorsManagementHref,
  conversationId,
  currentUser,
  onChatUpdate,
  onChatComplete,
  onSaveTitle,
}: {
  title: string;
  loading: boolean;
  messages: Message[];
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
  connectorsManagementHref: string;
  conversationId?: string;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  onChatUpdate: (messages: Message[]) => void;
  onChatComplete: (messages: Message[]) => void;
  onSaveTitle: (title: string) => void;
}) {
  const license = useLicenseContext();
  const hasCorrectLicense = license?.hasAtLeast('enterprise');

  const chatService = useObservabilityAIAssistantChatService();

  const timeline = useTimeline({
    messages,
    connectors,
    currentUser,
    chatService,
    onChatUpdate,
    onChatComplete,
  });

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  let footer: React.ReactNode;

  const isLoading = Boolean(
    connectors.loading || knowledgeBase.status.loading || last(timeline.items)?.loading
  );

  useEffect(() => {
    const parent = timelineContainerRef.current?.parentElement;
    if (!parent) {
      return;
    }

    let rafId: number | undefined;

    const isAtBottom = () => parent.scrollTop >= parent.scrollHeight - parent.offsetHeight;

    const stick = () => {
      if (!isAtBottom()) {
        parent.scrollTop = parent.scrollHeight - parent.offsetHeight;
      }
      rafId = requestAnimationFrame(stick);
    };

    const unstick = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = undefined;
      }
    };

    const onScroll = (event: Event) => {
      if (isAtBottom()) {
        stick();
      } else {
        unstick();
      }
    };

    parent.addEventListener('scroll', onScroll);

    stick();

    return () => {
      unstick();
      parent.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineContainerRef.current]);

  if (!hasCorrectLicense && !conversationId) {
    footer = (
      <>
        <EuiFlexItem grow className={incorrectLicenseContainer}>
          <IncorrectLicensePanel />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
            <ChatPromptEditor loading={isLoading} disabled onSubmit={timeline.onSubmit} />
            <EuiSpacer size="s" />
          </EuiPanel>
        </EuiFlexItem>
      </>
    );
  } else if (connectors.loading || knowledgeBase.status.loading) {
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
          <div ref={timelineContainerRef}>
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
              <ChatTimeline
                items={timeline.items}
                onEdit={timeline.onEdit}
                onFeedback={timeline.onFeedback}
                onRegenerate={timeline.onRegenerate}
                onStopGenerating={timeline.onStopGenerating}
              />
            </EuiPanel>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
            <ChatPromptEditor
              loading={isLoading}
              disabled={!connectors.selectedConnector || !hasCorrectLicense}
              onSubmit={timeline.onSubmit}
            />
            <EuiSpacer size="s" />
          </EuiPanel>
        </EuiFlexItem>
      </>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none" className={containerClassName}>
      <EuiFlexItem grow={false}>
        <ExperimentalFeatureBanner />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChatHeader
          connectors={connectors}
          licenseInvalid={!hasCorrectLicense && !conversationId}
          knowledgeBase={knowledgeBase}
          loading={loading}
          title={title}
          onSaveTitle={onSaveTitle}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      {footer}
    </EuiFlexGroup>
  );
}
