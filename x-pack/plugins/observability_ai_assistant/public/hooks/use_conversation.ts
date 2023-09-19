/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { merge, omit } from 'lodash';
import { Dispatch, SetStateAction, useState } from 'react';
import { type Conversation, type Message } from '../../common';
import type { ConversationCreateRequest } from '../../common/types';
import { ObservabilityAIAssistantChatService } from '../types';
import { useAbortableAsync, type AbortableAsyncState } from './use_abortable_async';
import { useKibana } from './use_kibana';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';
import { createNewConversation } from './use_timeline';

export function useConversation({
  conversationId,
  chatService,
  connectorId,
}: {
  conversationId?: string;
  chatService?: ObservabilityAIAssistantChatService;
  connectorId: string | undefined;
}): {
  conversation: AbortableAsyncState<ConversationCreateRequest | Conversation | undefined>;
  displayedMessages: Message[];
  setDisplayedMessages: Dispatch<SetStateAction<Message[]>>;
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

  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);

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
    displayedMessages,
    setDisplayedMessages,
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
                    omit(conversationObject, 'conversation.last_updated', 'namespace', 'user'),
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
