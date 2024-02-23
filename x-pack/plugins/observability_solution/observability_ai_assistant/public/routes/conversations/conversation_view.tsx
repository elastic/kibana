/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { v4 } from 'uuid';
import { css } from '@emotion/css';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import usePrevious from 'react-use/lib/usePrevious';
import { ChatBody } from '../../components/chat/chat_body';
import { ConversationList } from '../../components/chat/conversation_list';
import { ObservabilityAIAssistantChatServiceProvider } from '../../context/observability_ai_assistant_chat_service_provider';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useForceUpdate } from '../../hooks/use_force_update';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useObservabilityAIAssistantParams } from '../../hooks/use_observability_ai_assistant_params';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { ChatInlineEditingContent } from '../../components/chat/chat_inline_edit';

const SECOND_SLOT_CONTAINER_WIDTH = 400;

export function ConversationView() {
  const { euiTheme } = useEuiTheme();

  const currentUser = useCurrentUser();

  const service = useObservabilityAIAssistant();

  const connectors = useGenAIConnectors();

  const knowledgeBase = useKnowledgeBase();

  const observabilityAIAssistantRouter = useObservabilityAIAssistantRouter();

  const { path } = useObservabilityAIAssistantParams('/conversations/*');

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return service.start({ signal });
    },
    [service]
  );

  const conversationId = 'conversationId' in path ? path.conversationId : undefined;

  // Regenerate the key only when the id changes, except after
  // creating the conversation. Ideally this happens by adding
  // state to the current route, but I'm not keen on adding
  // the concept of state to the router, due to a mismatch
  // between router.link() and router.push(). So, this is a
  // pretty gross workaround for persisting a key under some
  // conditions.
  const chatBodyKeyRef = useRef(v4());
  const keepPreviousKeyRef = useRef(false);
  const prevConversationId = usePrevious(conversationId);

  const [secondSlotContainer, setSecondSlotContainer] = useState<HTMLDivElement | null>(null);
  const [isSecondSlotVisible, setIsSecondSlotVisible] = useState(false);

  if (conversationId !== prevConversationId && keepPreviousKeyRef.current === false) {
    chatBodyKeyRef.current = v4();
  }

  keepPreviousKeyRef.current = false;

  const forceUpdate = useForceUpdate();

  const conversations = useAbortableAsync(
    ({ signal }) => {
      return service.callApi('POST /internal/observability_ai_assistant/conversations', {
        signal,
      });
    },
    [service]
  );

  function navigateToConversation(nextConversationId?: string, usePrevConversationKey?: boolean) {
    if (nextConversationId) {
      observabilityAIAssistantRouter.push('/conversations/{conversationId}', {
        path: {
          conversationId: nextConversationId,
        },
        query: {},
      });
    } else {
      observabilityAIAssistantRouter.push('/conversations/new', { path: {}, query: {} });
    }
  }

  function handleRefreshConversations() {
    conversations.refresh();
  }

  const handleConversationUpdate = (conversation: { conversation: { id: string } }) => {
    if (!conversationId) {
      keepPreviousKeyRef.current = true;
      navigateToConversation(conversation.conversation.id);
    }
    handleRefreshConversations();
  };

  useEffect(() => {
    return () => {
      setIsSecondSlotVisible(false);
      if (secondSlotContainer) {
        ReactDOM.unmountComponentAtNode(secondSlotContainer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerClassName = css`
    max-width: 100%;
  `;

  const conversationListContainerName = css`
    min-width: 250px;
    width: 250px;
    border-right: solid 1px ${euiThemeVars.euiColorLightShade};
  `;

  const sidebarContainerClass = css`
    display: flex;
    position: absolute;
    z-index: 1;
    top: 56px;
    right: 0;
    height: calc(100% - 56px);
    background-color: ${euiTheme.colors.lightestShade};
    width: ${isSecondSlotVisible ? SECOND_SLOT_CONTAINER_WIDTH : 0}px;
    border-top: solid 1px ${euiThemeVars.euiColorLightShade};
    border-left: solid 1px ${euiThemeVars.euiColorLightShade};

    .euiFlyoutHeader {
      padding: ${euiTheme.size.m};
    }

    .euiFlyoutFooter {
      padding: ${euiTheme.size.m};
      padding-top: ${euiTheme.size.l};
      padding-bottom: ${euiTheme.size.l};
    }
  `;

  return (
    <EuiFlexGroup direction="row" className={containerClassName} gutterSize="none">
      <EuiFlexItem grow={false} className={conversationListContainerName}>
        <ConversationList
          selected={conversationId ?? ''}
          onClickNewChat={() => {
            if (conversationId) {
              observabilityAIAssistantRouter.push('/conversations/new', {
                path: {},
                query: {},
              });
            } else {
              // clear the chat
              chatBodyKeyRef.current = v4();
              forceUpdate();
            }
          }}
          onClickChat={(id) => {
            navigateToConversation(id, false);
          }}
          onClickDeleteConversation={(id) => {
            if (conversationId === id) {
              navigateToConversation(undefined, false);
            }
          }}
        />
        <EuiSpacer size="s" />
      </EuiFlexItem>

      {!chatService.value ? (
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xl" />
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {chatService.value && (
        <ObservabilityAIAssistantChatServiceProvider value={chatService.value}>
          <ChatBody
            key={chatBodyKeyRef.current}
            currentUser={currentUser}
            connectors={connectors}
            initialConversationId={conversationId}
            knowledgeBase={knowledgeBase}
            showLinkToConversationsApp={false}
            startedFrom="conversationView"
            onConversationUpdate={handleConversationUpdate}
          />

          <div className={sidebarContainerClass}>
            <ChatInlineEditingContent
              setContainer={setSecondSlotContainer}
              visible={isSecondSlotVisible}
              style={{ width: '100%' }}
            />
          </div>
        </ObservabilityAIAssistantChatServiceProvider>
      )}
    </EuiFlexGroup>
  );
}
