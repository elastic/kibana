/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { merge, omit } from 'lodash';
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';
import { type Conversation, type Message } from '../../common';
import { ConversationCreateRequest, MessageRole } from '../../common/types';
import { getAssistantSetupMessage } from '../service/get_assistant_setup_message';
import { ObservabilityAIAssistantChatService } from '../types';
import { useAbortableAsync, type AbortableAsyncState } from './use_abortable_async';
import { useKibana } from './use_kibana';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';
import { createNewConversation } from './use_timeline';

export function useConversation({
  conversationId,
  chatService,
  connectorId,
  initialMessages = [],
}: {
  conversationId?: string;
  chatService?: ObservabilityAIAssistantChatService; // will eventually resolve to a non-nullish value
  connectorId: string | undefined;
  initialMessages?: Message[];
}): {
  conversation: AbortableAsyncState<ConversationCreateRequest | Conversation | undefined>;
  displayedMessages: Message[];
  setDisplayedMessages: Dispatch<SetStateAction<Message[]>>;
  getSystemMessage: () => Message;
  save: (messages: Message[], handleRefreshConversations?: () => void) => Promise<Conversation>;
  saveTitle: (
    title: string,
    handleRefreshConversations?: () => void
  ) => Promise<Conversation | void>;
} {
  const service = useObservabilityAIAssistant();

  const {
    services: { notifications },
  } = useKibana();

  const [displayedMessages, setDisplayedMessages] = useState<Message[]>(initialMessages);

  const getSystemMessage = useCallback(() => {
    return getAssistantSetupMessage({ contexts: chatService?.getContexts() || [] });
  }, [chatService]);

  const displayedMessagesWithHardcodedSystemMessage = useMemo(() => {
    if (!chatService) {
      return displayedMessages;
    }

    const systemMessage = getSystemMessage();

    if (displayedMessages[0]?.message.role === MessageRole.User) {
      return [systemMessage, ...displayedMessages];
    }

    return [systemMessage, ...displayedMessages.slice(1)];
  }, [displayedMessages, chatService, getSystemMessage]);

  const conversation: AbortableAsyncState<ConversationCreateRequest | Conversation | undefined> =
    useAbortableAsync(
      ({ signal }) => {
        if (!conversationId) {
          const nextConversation = createNewConversation({
            contexts: chatService?.getContexts() || [],
          });
          setDisplayedMessages(nextConversation.messages);
          return nextConversation;
        }

        return service
          .callApi('GET /internal/observability_ai_assistant/conversation/{conversationId}', {
            signal,
            params: { path: { conversationId } },
          })
          .then((nextConversation) => {
            setDisplayedMessages(nextConversation.messages);
            return nextConversation;
          })
          .catch((error) => {
            setDisplayedMessages([]);
            throw error;
          });
      },
      [conversationId, chatService]
    );

  return {
    conversation,
    displayedMessages: displayedMessagesWithHardcodedSystemMessage,
    setDisplayedMessages,
    getSystemMessage,
    save: (messages: Message[], handleRefreshConversations?: () => void) => {
      const conversationObject = conversation.value!;

      return conversationId
        ? service
            .callApi(`PUT /internal/observability_ai_assistant/conversation/{conversationId}`, {
              signal: null,
              params: {
                path: {
                  conversationId,
                },
                body: {
                  conversation: merge(
                    {
                      '@timestamp': conversationObject['@timestamp'],
                      conversation: {
                        id: conversationId,
                      },
                    },
                    omit(
                      conversationObject,
                      'conversation.last_updated',
                      'namespace',
                      'user',
                      'messages'
                    ),
                    { messages }
                  ),
                },
              },
            })
            .catch((err) => {
              notifications.toasts.addError(err, {
                title: i18n.translate('xpack.observabilityAiAssistant.errorUpdatingConversation', {
                  defaultMessage: 'Could not update conversation',
                }),
              });
              throw err;
            })
        : service
            .callApi(`POST /internal/observability_ai_assistant/conversation`, {
              signal: null,
              params: {
                body: {
                  conversation: merge({}, conversationObject, { messages }),
                },
              },
            })
            .then((nextConversation) => {
              if (connectorId) {
                service
                  .callApi(
                    `PUT /internal/observability_ai_assistant/conversation/{conversationId}/auto_title`,
                    {
                      signal: null,
                      params: {
                        path: {
                          conversationId: nextConversation.conversation.id,
                        },
                        body: {
                          connectorId,
                        },
                      },
                    }
                  )
                  .then(() => {
                    handleRefreshConversations?.();
                    return conversation.refresh();
                  });
              }
              return nextConversation;
            })
            .catch((err) => {
              notifications.toasts.addError(err, {
                title: i18n.translate('xpack.observabilityAiAssistant.errorCreatingConversation', {
                  defaultMessage: 'Could not create conversation',
                }),
              });
              throw err;
            });
    },
    saveTitle: (title: string, handleRefreshConversations?: () => void) => {
      if (conversationId) {
        return service
          .callApi('PUT /internal/observability_ai_assistant/conversation/{conversationId}/title', {
            signal: null,
            params: {
              path: {
                conversationId,
              },
              body: {
                title,
              },
            },
          })
          .then(() => {
            handleRefreshConversations?.();
          });
      }
      return Promise.resolve();
    },
  };
}
