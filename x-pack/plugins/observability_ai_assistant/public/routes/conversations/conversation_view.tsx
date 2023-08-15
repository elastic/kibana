/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { ChatBody } from '../../components/chat/chat_body';
import { ConversationList } from '../../components/chat/conversation_list';
import { ObservabilityAIAssistantChatServiceProvider } from '../../context/observability_ai_assistant_chat_service_provider';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import { useConversation } from '../../hooks/use_conversation';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useObservabilityAIAssistantParams } from '../../hooks/use_observability_ai_assistant_params';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';
import { getConnectorsManagementHref } from '../../utils/get_connectors_management_href';

const containerClassName = css`
  max-width: 100%;
`;

const chatBodyContainerClassNameWithError = css`
  align-self: center;
`;

export function ConversationView() {
  const connectors = useGenAIConnectors();

  const knowledgeBase = useKnowledgeBase();

  const currentUser = useCurrentUser();

  const service = useObservabilityAIAssistant();

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

  const { conversation, displayedMessages, setDisplayedMessages, save } = useConversation({
    conversationId,
    chatService: chatService.value,
  });

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

  function navigateToConversation(nextConversationId?: string) {
    observabilityAIAssistantRouter.push(
      nextConversationId ? '/conversations/{conversationId}' : '/conversations/new',
      {
        path: { conversationId: nextConversationId },
        query: {},
      }
    );
  }

  return (
    <>
      {confirmDeleteElement}
      <EuiFlexGroup direction="row" className={containerClassName}>
        <EuiFlexItem grow={false}>
          <ConversationList
            selected={conversationId ?? ''}
            loading={conversations.loading || isUpdatingList}
            error={conversations.error}
            conversations={displayedConversations}
            onClickConversation={(nextConversationId) => {
              observabilityAIAssistantRouter.push('/conversations/{conversationId}', {
                path: {
                  conversationId: nextConversationId,
                },
                query: {},
              });
            }}
            onClickNewChat={() => {
              observabilityAIAssistantRouter.push('/conversations/new', {
                path: {},
                query: {},
              });
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
          <EuiSpacer size="m" />
        </EuiFlexItem>
        <EuiFlexItem
          grow
          className={conversation.error ? chatBodyContainerClassNameWithError : undefined}
        >
          {conversation.error ? (
            <EuiCallOut
              color="danger"
              title={i18n.translate(
                'xpack.observabilityAiAssistant.couldNotFindConversationTitle',
                {
                  defaultMessage: 'Conversation not found',
                }
              )}
              iconType="warning"
            >
              {i18n.translate('xpack.observabilityAiAssistant.couldNotFindConversationContent', {
                defaultMessage:
                  'Could not find a conversation with id {conversationId}. Make sure the conversation exists and you have access to it.',
                values: { conversationId },
              })}
            </EuiCallOut>
          ) : null}
          {chatService.loading || conversation.loading ? (
            <EuiFlexGroup direction="column" alignItems="center" gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiSpacer size="xl" />
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
          {!conversation.error && conversation.value && chatService.value ? (
            <ObservabilityAIAssistantChatServiceProvider value={chatService.value}>
              <ChatBody
                currentUser={currentUser}
                connectors={connectors}
                knowledgeBase={knowledgeBase}
                title={conversation.value.conversation.title}
                connectorsManagementHref={getConnectorsManagementHref(http)}
                messages={displayedMessages}
                onChatComplete={(messages) => {
                  save(messages)
                    .then((nextConversation) => {
                      conversations.refresh();
                      if (!conversationId) {
                        navigateToConversation(nextConversation.conversation.id);
                      }
                    })
                    .catch(() => {});
                }}
                onChatUpdate={(messages) => {
                  setDisplayedMessages(messages);
                }}
              />
            </ObservabilityAIAssistantChatServiceProvider>
          ) : null}
          <EuiSpacer size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
