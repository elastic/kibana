/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { ChatBody } from '../../components/chat/chat_body';
import { ChatInlineEditingContent } from '../../components/chat/chat_inline_edit';
import { ConversationList } from '../../components/chat/conversation_list';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useObservabilityAIAssistantParams } from '../../hooks/use_observability_ai_assistant_params';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { useObservabilityAIAssistantAppService } from '../../hooks/use_observability_ai_assistant_app_service';
import { useKibana } from '../../hooks/use_kibana';
import { useConversationKey } from '../../hooks/use_conversation_key';
import { useConversationList } from '../../hooks/use_conversation_list';

const SECOND_SLOT_CONTAINER_WIDTH = 400;

export function ConversationView() {
  const { euiTheme } = useEuiTheme();

  const currentUser = useCurrentUser();

  const service = useObservabilityAIAssistantAppService();

  const connectors = useGenAIConnectors();

  const knowledgeBase = useKnowledgeBase();

  const observabilityAIAssistantRouter = useObservabilityAIAssistantRouter();

  const { path } = useObservabilityAIAssistantParams('/conversations/*');

  const {
    services: {
      plugins: {
        start: {
          observabilityAIAssistant: { ObservabilityAIAssistantChatServiceContext },
        },
      },
    },
  } = useKibana();

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return service.start({ signal });
    },
    [service]
  );

  const conversationId = 'conversationId' in path ? path.conversationId : undefined;

  const { key: bodyKey, updateConversationIdInPlace } = useConversationKey(conversationId);

  const [secondSlotContainer, setSecondSlotContainer] = useState<HTMLDivElement | null>(null);
  const [isSecondSlotVisible, setIsSecondSlotVisible] = useState(false);

  const conversationList = useConversationList();

  function navigateToConversation(nextConversationId?: string) {
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
    conversationList.conversations.refresh();
  }

  const handleConversationUpdate = (conversation: { conversation: { id: string } }) => {
    if (!conversationId) {
      updateConversationIdInPlace(conversation.conversation.id);
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
    <EuiFlexGroup
      direction="row"
      className={containerClassName}
      gutterSize="none"
      data-test-subj="observabilityAiAssistantConversationsPage"
    >
      <EuiFlexItem grow={false} className={conversationListContainerName}>
        <ConversationList
          selectedConversationId={conversationId}
          conversations={conversationList.conversations}
          isLoading={conversationList.isLoading}
          onConversationDeleteClick={(deletedConversationId) => {
            conversationList.deleteConversation(deletedConversationId).then(() => {
              if (deletedConversationId === conversationId) {
                navigateToConversation(undefined);
              }
            });
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
        <ObservabilityAIAssistantChatServiceContext.Provider value={chatService.value}>
          <ChatBody
            key={bodyKey}
            currentUser={currentUser}
            connectors={connectors}
            initialConversationId={conversationId}
            knowledgeBase={knowledgeBase}
            showLinkToConversationsApp={false}
            onConversationUpdate={handleConversationUpdate}
            scope={scope}
          />

          <div className={sidebarContainerClass}>
            <ChatInlineEditingContent
              setContainer={setSecondSlotContainer}
              visible={isSecondSlotVisible}
              style={{ width: '100%' }}
            />
          </div>
        </ObservabilityAIAssistantChatServiceContext.Provider>
      )}
    </EuiFlexGroup>
  );
}
