/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css, keyframes } from '@emotion/css';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
  euiScrollBarStyles,
} from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { ChatState } from '../../hooks/use_chat';
import { useConversation } from '../../hooks/use_conversation';
import { useLicense } from '../../hooks/use_license';
import { useObservabilityAIAssistantChatService } from '../../hooks/use_observability_ai_assistant_chat_service';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import { type Conversation, type Message, MessageRole } from '../../../common/types';
import { ChatHeader } from './chat_header';
import { PromptEditor } from '../prompt_editor/prompt_editor';
import { ChatTimeline } from './chat_timeline';
import { Feedback } from '../feedback_buttons';
import { IncorrectLicensePanel } from './incorrect_license_panel';
import { WelcomeMessage } from './welcome_message';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';
import { ChatActionClickType } from './types';
import type { StartedFrom } from '../../utils/get_timeline_items_from_conversation';
import { TELEMETRY, sendEvent } from '../../analytics';

const fullHeightClassName = css`
  height: 100%;
`;

const timelineClassName = (scrollBarStyles: string) => css`
  overflow-y: auto;
  ${scrollBarStyles}
`;

const promptEditorClassname = css`
  overflow: hidden;
  transition: height ${euiThemeVars.euiAnimSpeedFast} ${euiThemeVars.euiAnimSlightResistance};
`;

const incorrectLicenseContainer = css`
  height: 100%;
  padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingMedium};
`;

const chatBodyContainerClassNameWithError = css`
  align-self: center;
`;

const promptEditorContainerClassName = css`
  padding-top: 12px;
  padding-bottom: 8px;
`;

const fadeInAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const animClassName = css`
  height: 100%;
  opacity: 0;
  animation: ${fadeInAnimation} ${euiThemeVars.euiAnimSpeedNormal}
    ${euiThemeVars.euiAnimSlightBounce} ${euiThemeVars.euiAnimSpeedNormal} forwards;
`;

const PADDING_AND_BORDER = 32;

export function ChatBody({
  initialTitle,
  initialMessages,
  initialConversationId,
  connectors,
  knowledgeBase,
  connectorsManagementHref,
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
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  startedFrom?: StartedFrom;
  onConversationUpdate: (conversation: { conversation: Conversation['conversation'] }) => void;
}) {
  const license = useLicense();
  const hasCorrectLicense = license?.hasAtLeast('enterprise');
  const euiTheme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(euiTheme);

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

  const [promptEditorHeight, setPromptEditorHeight] = useState<number>(0);

  const handleFeedback = (message: Message, feedback: Feedback) => {
    if (conversation.value?.conversation && 'user' in conversation.value) {
      sendEvent(chatService.analytics, {
        type: TELEMETRY.observability_ai_assistant_chat_feedback,
        payload: {
          messageWithFeedback: { message, feedback },
          conversation: conversation.value,
        },
      });
    }
  };

  const handleChangeHeight = (editorHeight: number) => {
    if (editorHeight === 0) {
      setPromptEditorHeight(0);
    } else {
      setPromptEditorHeight(editorHeight + PADDING_AND_BORDER);
    }
  };

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
            <PromptEditor
              hidden={connectors.loading || connectors.connectors?.length === 0}
              loading={isLoading}
              disabled
              onChangeHeight={setPromptEditorHeight}
              onSubmit={(message) => {
                next(messages.concat(message));
              }}
              onSendTelemetry={(eventWithPayload) =>
                sendEvent(chatService.analytics, eventWithPayload)
              }
            />
            <EuiSpacer size="s" />
          </EuiPanel>
        </EuiFlexItem>
      </>
    );
  } else if (!conversation.value && conversation.loading) {
    footer = null;
  } else {
    footer = (
      <>
        <EuiFlexItem grow className={timelineClassName(scrollBarStyles)}>
          <div ref={timelineContainerRef} className={fullHeightClassName}>
            <EuiPanel
              grow
              hasBorder={false}
              hasShadow={false}
              paddingSize="m"
              className={animClassName}
            >
              {connectors.connectors?.length === 0 || messages.length === 1 ? (
                <WelcomeMessage connectors={connectors} knowledgeBase={knowledgeBase} />
              ) : (
                <ChatTimeline
                  startedFrom={startedFrom}
                  messages={messages}
                  knowledgeBase={knowledgeBase}
                  chatService={chatService}
                  currentUser={currentUser}
                  chatState={state}
                  hasConnector={!!connectors.connectors?.length}
                  onEdit={(editedMessage, newMessage) => {
                    setStickToBottom(true);
                    const indexOf = messages.indexOf(editedMessage);
                    next(messages.slice(0, indexOf).concat(newMessage));
                  }}
                  onFeedback={handleFeedback}
                  onRegenerate={(message) => {
                    const indexOf = messages.indexOf(message);
                    next(messages.slice(0, indexOf));
                  }}
                  onSendTelemetry={(eventWithPayload) =>
                    sendEvent(chatService.analytics, eventWithPayload)
                  }
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
              )}
            </EuiPanel>
          </div>
        </EuiFlexItem>

        <EuiFlexItem
          grow={false}
          className={promptEditorClassname}
          style={{ height: promptEditorHeight }}
        >
          <EuiHorizontalRule margin="none" />
          <EuiPanel
            hasBorder={false}
            hasShadow={false}
            paddingSize="m"
            color="subdued"
            className={promptEditorContainerClassName}
          >
            <PromptEditor
              disabled={!connectors.selectedConnector || !hasCorrectLicense}
              hidden={connectors.loading || connectors.connectors?.length === 0}
              loading={isLoading}
              onChangeHeight={handleChangeHeight}
              onSendTelemetry={(eventWithPayload) =>
                sendEvent(chatService.analytics, eventWithPayload)
              }
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
