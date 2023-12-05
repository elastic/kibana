/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useMemo, useRef, useState } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { v4 } from 'uuid';
import { ChatBody } from '../../components/chat/chat_body';
import { ConversationList } from '../../components/chat/conversation_list';
import { ObservabilityAIAssistantChatServiceProvider } from '../../context/observability_ai_assistant_chat_service_provider';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useForceUpdate } from '../../hooks/use_force_update';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useObservabilityAIAssistantParams } from '../../hooks/use_observability_ai_assistant_params';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';
import { getConnectorsManagementHref } from '../../utils/get_connectors_management_href';
import { getModelsManagementHref } from '../../utils/get_models_management_href';

const containerClassName = css`
  max-width: 100%;
`;

const conversationListContainerName = css`
  min-width: 250px;
  width: 250px;
  border-right: solid 1px ${euiThemeVars.euiColorLightShade};
`;

export function ConversationView() {
  const currentUser = useCurrentUser();

  const service = useObservabilityAIAssistant();

  const connectors = useGenAIConnectors();

  const knowledgeBase = useKnowledgeBase();

  const observabilityAIAssistantRouter = useObservabilityAIAssistantRouter();

  const { path } = useObservabilityAIAssistantParams('/conversations/*');

  const {
    services: { http, notifications },
  } = useKibana();

  const { element: confirmDeleteElement, confirm: confirmDeleteFunction } = useConfirmModal({
    title: i18n.translate('xpack.observabilityAiAssistant.confirmDeleteConversationTitle', {
      defaultMessage: 'Delete this conversation?',
    }),
    children: i18n.translate('xpack.observabilityAiAssistant.confirmDeleteConversationContent', {
      defaultMessage: 'This action cannot be undone.',
    }),
    confirmButtonText: i18n.translate('xpack.observabilityAiAssistant.confirmDeleteButtonText', {
      defaultMessage: 'Delete conversation',
    }),
  });

  const [isUpdatingList, setIsUpdatingList] = useState(false);

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

  const displayedConversations = useMemo(() => {
    return [
      ...(!conversationId ? [{ id: '', label: EMPTY_CONVERSATION_TITLE }] : []),
      ...(conversations.value?.conversations ?? []).map((conv) => ({
        id: conv.conversation.id,
        label: conv.conversation.title,
        href: observabilityAIAssistantRouter.link('/conversations/{conversationId}', {
          path: {
            conversationId: conv.conversation.id,
          },
        }),
      })),
    ];
  }, [conversations.value?.conversations, conversationId, observabilityAIAssistantRouter]);

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

  return (
    <>
      {confirmDeleteElement}
      <EuiFlexGroup direction="row" className={containerClassName} gutterSize="none">
        <EuiFlexItem grow={false} className={conversationListContainerName}>
          <ConversationList
            selected={conversationId ?? ''}
            loading={conversations.loading || isUpdatingList}
            error={conversations.error}
            conversations={displayedConversations}
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
            onClickDeleteConversation={(id) => {
              confirmDeleteFunction()
                .then(async (confirmed) => {
                  if (!confirmed) {
                    return;
                  }

                  setIsUpdatingList(true);

                  await service.callApi(
                    'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
                    {
                      params: {
                        path: {
                          conversationId: id,
                        },
                      },
                      signal: null,
                    }
                  );

                  const isCurrentConversation = id === conversationId;
                  const hasOtherConversations = conversations.value?.conversations.find(
                    (conv) => 'id' in conv.conversation && conv.conversation.id !== id
                  );

                  if (isCurrentConversation) {
                    navigateToConversation(
                      hasOtherConversations
                        ? conversations.value!.conversations[0].conversation.id
                        : undefined
                    );
                  }

                  conversations.refresh();
                })
                .catch((error) => {
                  notifications.toasts.addError(error, {
                    title: i18n.translate(
                      'xpack.observabilityAiAssistant.failedToDeleteConversation',
                      {
                        defaultMessage: 'Could not delete conversation',
                      }
                    ),
                  });
                })
                .finally(() => {
                  setIsUpdatingList(false);
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
          <ObservabilityAIAssistantChatServiceProvider value={chatService.value}>
            <ChatBody
              key={chatBodyKeyRef.current}
              currentUser={currentUser}
              connectors={connectors}
              connectorsManagementHref={getConnectorsManagementHref(http)}
              modelsManagementHref={getModelsManagementHref(http)}
              initialConversationId={conversationId}
              knowledgeBase={knowledgeBase}
              startedFrom="conversationView"
              onConversationUpdate={(conversation) => {
                if (!conversationId) {
                  keepPreviousKeyRef.current = true;
                  navigateToConversation(conversation.conversation.id);
                }
                handleRefreshConversations();
              }}
            />
          </ObservabilityAIAssistantChatServiceProvider>
        )}
      </EuiFlexGroup>
    </>
  );
}
