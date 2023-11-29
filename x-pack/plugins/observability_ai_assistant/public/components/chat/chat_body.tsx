/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Conversation, Message, MessageRole } from '../../../common/types';
import { ChatState } from '../../hooks/use_chat';
import { useConversation } from '../../hooks/use_conversation';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import { useLicense } from '../../hooks/use_license';
import { useObservabilityAIAssistantChatService } from '../../hooks/use_observability_ai_assistant_chat_service';
import { StartedFrom } from '../../utils/get_timeline_items_from_conversation';
import { ChatHeader } from './chat_header';
import { ChatPromptEditor } from './chat_prompt_editor';
import { ChatTimeline } from './chat_timeline';
import { ExperimentalFeatureBanner } from './experimental_feature_banner';
import { IncorrectLicensePanel } from './incorrect_license_panel';
import { InitialSetupPanel } from './initial_setup_panel';
import { ChatActionClickType } from './types';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';

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

const chatBodyContainerClassNameWithError = css`
  align-self: center;
`;

export function ChatBody({
  initialTitle,
  initialMessages,
  initialConversationId,
  connectors,
  knowledgeBase,
  connectorsManagementHref,
  modelsManagementHref,
  currentUser,
  startedFrom,
  onConversationUpdate,
}: {
  initialTitle?: string;
  initialMessages?: Message[];
  initialConversationId?: string;
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
  connectorsManagementHref: string;
  modelsManagementHref: string;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  startedFrom?: StartedFrom;
  onConversationUpdate: (conversation: Conversation) => void;
}) {
  const license = useLicense();
  const hasCorrectLicense = license?.hasAtLeast('enterprise');

  const chatService = useObservabilityAIAssistantChatService();

  const { conversation, messages, next, state, stop, saveTitle } = useConversation({
    initialConversationId,
    initialMessages,
    initialTitle,
    chatService,
    connectorId: connectors.selectedConnector,
    onConversationUpdate,
  });

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  let footer: React.ReactNode;

  const isLoading = Boolean(
    connectors.loading ||
      knowledgeBase.status.loading ||
      state === ChatState.Loading ||
      conversation.loading
  );

  const containerClassName = css`
    max-height: 100%;
    max-width: ${startedFrom === 'conversationView'
      ? 1200 - 250 + 'px' // page template max width - conversation list width.
      : '100%'};
  `;

  const [stickToBottom, setStickToBottom] = useState(true);

  const isAtBottom = (parent: HTMLElement) =>
    parent.scrollTop + parent.clientHeight >= parent.scrollHeight;

  useEffect(() => {
    const parent = timelineContainerRef.current?.parentElement;
    if (!parent) {
      return;
    }

    function onScroll() {
      setStickToBottom(isAtBottom(parent!));
    }

    parent.addEventListener('scroll', onScroll);

    return () => {
      parent.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineContainerRef.current]);

  useEffect(() => {
    const parent = timelineContainerRef.current?.parentElement;
    if (!parent) {
      return;
    }

    if (stickToBottom) {
      parent.scrollTop = parent.scrollHeight;
    }
  });

  const handleCopyConversation = () => {
    const content = JSON.stringify({ title: initialTitle, messages });

    navigator.clipboard?.writeText(content || '');
  };

  if (!hasCorrectLicense && !initialConversationId) {
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
            <ChatPromptEditor
              loading={isLoading}
              disabled
              onSubmit={(message) => {
                next(messages.concat(message));
              }}
            />
            <EuiSpacer size="s" />
          </EuiPanel>
        </EuiFlexItem>
      </>
    );
  } else if (
    connectors.loading ||
    knowledgeBase.status.loading ||
    (!conversation.value && conversation.loading)
  ) {
    footer = (
      <EuiFlexItem className={loadingSpinnerContainerClassName}>
        <EuiLoadingSpinner />
      </EuiFlexItem>
    );
  } else if (connectors.connectors?.length === 0 && !initialConversationId) {
    footer = (
      <InitialSetupPanel
        connectors={connectors}
        connectorsManagementHref={connectorsManagementHref}
        knowledgeBase={knowledgeBase}
        startedFrom={startedFrom}
      />
    );
  } else {
    footer = (
      <>
        <EuiFlexItem grow className={timelineClassName}>
          <div ref={timelineContainerRef}>
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
              <ChatTimeline
                startedFrom={startedFrom}
                messages={messages}
                knowledgeBase={knowledgeBase}
                chatService={chatService}
                currentUser={currentUser}
                chatState={state}
                hasConnector={!!connectors.connectors?.length}
                onEdit={(editedMessage, newMessage) => {
                  const indexOf = messages.indexOf(editedMessage);
                  next(messages.slice(0, indexOf).concat(newMessage));
                }}
                onFeedback={(message, feedback) => {}}
                onRegenerate={(message) => {
                  const indexOf = messages.indexOf(message);
                  next(messages.slice(0, indexOf));
                }}
                onStopGenerating={() => {
                  stop();
                }}
                onActionClick={(payload) => {
                  setStickToBottom(true);
                  switch (payload.type) {
                    case ChatActionClickType.executeEsqlQuery:
                      next(
                        messages.concat({
                          '@timestamp': new Date().toISOString(),
                          message: {
                            role: MessageRole.Assistant,
                            content: '',
                            function_call: {
                              name: 'execute_query',
                              arguments: JSON.stringify({
                                query: payload.query,
                              }),
                              trigger: MessageRole.User,
                            },
                          },
                        })
                      );
                      break;
                  }
                }}
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
              onSubmit={(message) => {
                setStickToBottom(true);
                return next(messages.concat(message));
              }}
            />
            <EuiSpacer size="s" />
          </EuiPanel>
        </EuiFlexItem>
      </>
    );
  }

  if (conversation.error) {
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        className={containerClassName}
        justifyContent="center"
      >
        <EuiFlexItem grow={false} className={chatBodyContainerClassNameWithError}>
          <EuiCallOut
            color="danger"
            title={i18n.translate('xpack.observabilityAiAssistant.couldNotFindConversationTitle', {
              defaultMessage: 'Conversation not found',
            })}
            iconType="warning"
          >
            {i18n.translate('xpack.observabilityAiAssistant.couldNotFindConversationContent', {
              defaultMessage:
                'Could not find a conversation with id {conversationId}. Make sure the conversation exists and you have access to it.',
              values: { conversationId: initialConversationId },
            })}
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none" className={containerClassName}>
      {connectors.selectedConnector ? (
        <EuiFlexItem grow={false}>
          <ExperimentalFeatureBanner />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem
        grow={false}
        className={conversation.error ? chatBodyContainerClassNameWithError : undefined}
      >
        {conversation.error ? (
          <EuiCallOut
            color="danger"
            title={i18n.translate('xpack.observabilityAiAssistant.couldNotFindConversationTitle', {
              defaultMessage: 'Conversation not found',
            })}
            iconType="warning"
          >
            {i18n.translate('xpack.observabilityAiAssistant.couldNotFindConversationContent', {
              defaultMessage:
                'Could not find a conversation with id {conversationId}. Make sure the conversation exists and you have access to it.',
              values: { conversationId: initialConversationId },
            })}
          </EuiCallOut>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChatHeader
          connectors={connectors}
          conversationId={
            conversation.value?.conversation && 'id' in conversation.value.conversation
              ? conversation.value.conversation.id
              : undefined
          }
          connectorsManagementHref={connectorsManagementHref}
          modelsManagementHref={modelsManagementHref}
          knowledgeBase={knowledgeBase}
          licenseInvalid={!hasCorrectLicense && !initialConversationId}
          loading={isLoading}
          startedFrom={startedFrom}
          title={conversation.value?.conversation.title || initialTitle || EMPTY_CONVERSATION_TITLE}
          onCopyConversation={handleCopyConversation}
          onSaveTitle={(newTitle) => {
            saveTitle(newTitle);
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      {footer}
    </EuiFlexGroup>
  );
}
