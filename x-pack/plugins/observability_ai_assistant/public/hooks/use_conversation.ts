/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { merge, omit } from 'lodash';
import { useState } from 'react';
import type { Conversation, Message } from '../../common';
import type { ConversationCreateRequest } from '../../common/types';
import { EMPTY_CONVERSATION_TITLE } from '../i18n';
import type { ObservabilityAIAssistantChatService } from '../types';
import { useAbortableAsync, type AbortableAsyncState } from './use_abortable_async';
import { useChat, UseChatResult } from './use_chat';
import { useKibana } from './use_kibana';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';
import { useOnce } from './use_once';

function createNewConversation({
  title = EMPTY_CONVERSATION_TITLE,
}: { title?: string } = {}): ConversationCreateRequest {
  return {
    '@timestamp': new Date().toISOString(),
    messages: [],
    conversation: {
      title,
    },
    labels: {},
    numeric_labels: {},
    public: false,
  };
}

export interface UseConversationProps {
  initialConversationId?: string;
  initialMessages?: Message[];
  initialTitle?: string;
  chatService: ObservabilityAIAssistantChatService;
  connectorId: string | undefined;
  onConversationUpdate?: (conversation: Conversation) => void;
}

export type UseConversationResult = {
  conversation: AbortableAsyncState<ConversationCreateRequest | Conversation | undefined>;
  saveTitle: (newTitle: string) => void;
} & Omit<UseChatResult, 'setMessages'>;

const DEFAULT_INITIAL_MESSAGES: Message[] = [];

export function useConversation({
  initialConversationId: initialConversationIdFromProps,
  initialMessages: initialMessagesFromProps = DEFAULT_INITIAL_MESSAGES,
  initialTitle: initialTitleFromProps,
  chatService,
  connectorId,
  onConversationUpdate,
}: UseConversationProps): UseConversationResult {
  const service = useObservabilityAIAssistant();

  const {
    services: { notifications },
  } = useKibana();

  const initialConversationId = useOnce(initialConversationIdFromProps);
  const initialMessages = useOnce(initialMessagesFromProps);
  const initialTitle = useOnce(initialTitleFromProps);

  if (initialMessages.length && initialConversationId) {
    throw new Error('Cannot set initialMessages if initialConversationId is set');
  }

  const update = (nextConversationObject: Conversation) => {
    return service
      .callApi(`PUT /internal/observability_ai_assistant/conversation/{conversationId}`, {
        signal: null,
        params: {
          path: {
            conversationId: nextConversationObject.conversation.id,
          },
          body: {
            conversation: merge(
              {
                '@timestamp': nextConversationObject['@timestamp'],
                conversation: {
                  id: nextConversationObject.conversation.id,
                },
              },
              omit(nextConversationObject, 'conversation.last_updated', 'namespace', 'user')
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
      });
  };

  const save = (nextMessages: Message[]) => {
    const conversationObject = conversation.value!;

    const nextConversationObject = merge({}, omit(conversationObject, 'messages'), {
      messages: nextMessages,
    });

    return (
      displayedConversationId
        ? update(
            merge(
              { conversation: { id: displayedConversationId } },
              nextConversationObject
            ) as Conversation
          )
        : service
            .callApi(`POST /internal/observability_ai_assistant/conversation`, {
              signal: null,
              params: {
                body: {
                  conversation: nextConversationObject,
                },
              },
            })
            .then((nextConversation) => {
              setDisplayedConversationId(nextConversation.conversation.id);
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
                    onConversationUpdate?.(nextConversation);
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
            })
    ).then((nextConversation) => {
      onConversationUpdate?.(nextConversation);
      return nextConversation;
    });
  };

  const { next, messages, setMessages, state, stop } = useChat({
    initialMessages,
    chatService,
    connectorId,
    onChatComplete: (nextMessages) => {
      save(nextMessages);
    },
  });

  const [displayedConversationId, setDisplayedConversationId] = useState(initialConversationId);

  const conversation: AbortableAsyncState<ConversationCreateRequest | Conversation | undefined> =
    useAbortableAsync(
      ({ signal }) => {
        if (!displayedConversationId) {
          const nextConversation = createNewConversation({ title: initialTitle });
          return nextConversation;
        }

        return service
          .callApi('GET /internal/observability_ai_assistant/conversation/{conversationId}', {
            signal,
            params: { path: { conversationId: displayedConversationId } },
          })
          .then((nextConversation) => {
            setMessages(nextConversation.messages);
            return nextConversation;
          })
          .catch((error) => {
            setMessages([]);
            throw error;
          });
      },
      [displayedConversationId, initialTitle],
      {
        defaultValue: () => {
          if (!displayedConversationId) {
            const nextConversation = createNewConversation({ title: initialTitle });
            return nextConversation;
          }
          return undefined;
        },
      }
    );

  return {
    conversation,
    state,
    next,
    stop,
    messages,
    saveTitle: (title: string) => {
      if (!displayedConversationId || !conversation.value) {
        throw new Error('Cannot save title if conversation is not stored');
      }
      const nextConversation = merge({}, conversation.value as Conversation, {
        conversation: { title },
      });
      return update(nextConversation)
        .then(() => {
          return conversation.refresh();
        })
        .then(() => {
          onConversationUpdate?.(nextConversation);
        });
    },
  };
}
