/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { last } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { isObservable, Observable, Subscription } from 'rxjs';
import {
  ContextDefinition,
  MessageRole,
  type ConversationCreateRequest,
  type Message,
} from '../../common/types';
import type { ChatPromptEditorProps } from '../components/chat/chat_prompt_editor';
import type { ChatTimelineItem, ChatTimelineProps } from '../components/chat/chat_timeline';
import { ChatActionClickType } from '../components/chat/types';
import { EMPTY_CONVERSATION_TITLE } from '../i18n';
import type { ObservabilityAIAssistantChatService, PendingMessage } from '../types';
import {
  getTimelineItemsfromConversation,
  StartedFrom,
} from '../utils/get_timeline_items_from_conversation';
import type { UseGenAIConnectorsResult } from './use_genai_connectors';
import { useKibana } from './use_kibana';

export function createNewConversation({
  contexts,
}: {
  contexts: ContextDefinition[];
}): ConversationCreateRequest {
  return {
    '@timestamp': new Date().toISOString(),
    messages: [],
    conversation: {
      title: EMPTY_CONVERSATION_TITLE,
    },
    labels: {},
    numeric_labels: {},
    public: false,
  };
}

export type UseTimelineResult = Pick<
  ChatTimelineProps,
  'onEdit' | 'onFeedback' | 'onRegenerate' | 'onStopGenerating' | 'onActionClick' | 'items'
> &
  Pick<ChatPromptEditorProps, 'onSubmit'>;

export function useTimeline({
  messages,
  connectors,
  conversationId,
  currentUser,
  chatService,
  startedFrom,
  onChatUpdate,
  onChatComplete,
}: {
  messages: Message[];
  conversationId?: string;
  connectors: UseGenAIConnectorsResult;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  chatService: ObservabilityAIAssistantChatService;
  startedFrom?: StartedFrom;
  onChatUpdate: (messages: Message[]) => void;
  onChatComplete: (messages: Message[]) => void;
}): UseTimelineResult {
  const connectorId = connectors.selectedConnector;

  const hasConnector = !!connectorId;

  const {
    services: { notifications },
  } = useKibana();

  const conversationItems = useMemo(() => {
    const items = getTimelineItemsfromConversation({
      currentUser,
      chatService,
      hasConnector,
      messages,
      startedFrom,
    });

    return items;
  }, [currentUser, chatService, hasConnector, messages, startedFrom]);

  const [subscription, setSubscription] = useState<Subscription | undefined>();

  const controllerRef = useRef(new AbortController());

  const [pendingMessage, setPendingMessage] = useState<PendingMessage>();

  const [isFunctionLoading, setIsFunctionLoading] = useState(false);

  const prevConversationId = usePrevious(conversationId);

  useEffect(() => {
    if (prevConversationId !== conversationId && pendingMessage?.error) {
      setPendingMessage(undefined);
    }
  }, [conversationId, pendingMessage?.error, prevConversationId]);

  function chat(
    nextMessages: Message[],
    response$: Observable<PendingMessage> | undefined = undefined
  ): Promise<Message[]> {
    const controller = new AbortController();

    return new Promise<PendingMessage | undefined>(async (resolve, reject) => {
      try {
        if (!connectorId) {
          reject(new Error('Can not add a message without a connector'));
          return;
        }

        const isStartOfConversation =
          nextMessages.some((message) => message.message.role === MessageRole.Assistant) === false;

        if (isStartOfConversation && chatService.hasFunction('recall')) {
          nextMessages = nextMessages.concat({
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: '',
              function_call: {
                name: 'recall',
                arguments: JSON.stringify({ queries: [], contexts: [] }),
                trigger: MessageRole.User,
              },
            },
          });
        }

        onChatUpdate(nextMessages);
        const lastMessage = last(nextMessages);
        if (lastMessage?.message.function_call?.name) {
          // the user has edited a function suggestion, no need to talk to the LLM
          resolve(undefined);
          return;
        }

        response$ =
          response$ ||
          chatService!.chat({
            messages: nextMessages,
            connectorId,
          });
        let pendingMessageLocal = pendingMessage;
        const nextSubscription = response$.subscribe({
          next: (nextPendingMessage) => {
            pendingMessageLocal = nextPendingMessage;
            setPendingMessage(() => nextPendingMessage);
          },
          error: reject,
          complete: () => {
            const error = pendingMessageLocal?.error;
            if (error) {
              notifications.toasts.addError(error, {
                title: i18n.translate('xpack.observabilityAiAssistant.failedToLoadResponse', {
                  defaultMessage: 'Failed to load response from the AI Assistant',
                }),
              });
            }
            resolve(pendingMessageLocal!);
          },
        });
        setSubscription(() => {
          controllerRef.current = controller;
          return nextSubscription;
        });
      } catch (error) {
        reject(error);
      }
    }).then(async (reply) => {
      if (reply?.error) {
        return nextMessages;
      }
      if (reply?.aborted) {
        return nextMessages;
      }

      setPendingMessage(undefined);

      const messagesAfterChat = reply
        ? nextMessages.concat({
            '@timestamp': new Date().toISOString(),
            message: {
              ...reply.message,
            },
          })
        : nextMessages;

      onChatUpdate(messagesAfterChat);

      const lastMessage = last(messagesAfterChat);

      if (lastMessage?.message.function_call?.name) {
        const name = lastMessage.message.function_call.name;

        setIsFunctionLoading(true);

        try {
          let message = await chatService!.executeFunction({
            name,
            args: lastMessage.message.function_call.arguments,
            messages: messagesAfterChat.slice(0, -1),
            signal: controller.signal,
            connectorId: connectorId!,
          });

          let nextResponse$: Observable<PendingMessage> | undefined;

          if (isObservable(message)) {
            nextResponse$ = message;
            message = { content: '', data: '' };
          }

          return await chat(
            messagesAfterChat.concat({
              '@timestamp': new Date().toISOString(),
              message: {
                name,
                role: MessageRole.User,
                content: JSON.stringify(message.content),
                data: JSON.stringify(message.data),
              },
            }),
            nextResponse$
          );
        } catch (error) {
          return await chat(
            messagesAfterChat.concat({
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                name,
                content: JSON.stringify({
                  message: error.toString(),
                  error,
                }),
              },
            })
          );
        } finally {
          setIsFunctionLoading(false);
        }
      }

      return messagesAfterChat;
    });
  }

  const itemsWithAddedLoadingStates = useMemo(() => {
    // While we're loading we add an empty loading chat item:
    if (pendingMessage || isFunctionLoading) {
      const nextItems = conversationItems.concat({
        id: '',
        actions: {
          canCopy: true,
          canEdit: false,
          canGiveFeedback: false,
          canRegenerate: pendingMessage?.aborted || !!pendingMessage?.error,
        },
        display: {
          collapsed: false,
          hide: pendingMessage?.message.role === MessageRole.System,
        },
        content: pendingMessage?.message.content,
        currentUser,
        error: pendingMessage?.error,
        function_call: pendingMessage?.message.function_call,
        loading: !pendingMessage?.aborted && !pendingMessage?.error,
        role: pendingMessage?.message.role || MessageRole.Assistant,
        title: '',
      });

      return nextItems;
    }

    if (!isFunctionLoading) {
      return conversationItems;
    }

    return conversationItems.map((item, index) => {
      // When we're done loading we remove the placeholder item again
      if (index < conversationItems.length - 1) {
        return item;
      }
      return {
        ...item,
        loading: true,
      };
    });
  }, [conversationItems, pendingMessage, currentUser, isFunctionLoading]);

  const items = useMemo(() => {
    const consolidatedChatItems: Array<ChatTimelineItem | ChatTimelineItem[]> = [];
    let currentGroup: ChatTimelineItem[] | null = null;

    for (const item of itemsWithAddedLoadingStates) {
      if (item.display.hide || !item) continue;

      if (item.display.collapsed) {
        if (currentGroup) {
          currentGroup.push(item);
        } else {
          currentGroup = [item];
          consolidatedChatItems.push(currentGroup);
        }
      } else {
        consolidatedChatItems.push(item);
        currentGroup = null;
      }
    }

    return consolidatedChatItems;
  }, [itemsWithAddedLoadingStates]);

  useEffect(() => {
    return () => {
      subscription?.unsubscribe();
    };
  }, [subscription]);

  return {
    items,
    onEdit: async (item, newMessage) => {
      const indexOf = items.indexOf(item);
      const sliced = messages.slice(0, indexOf - 1);
      const nextMessages = await chat(sliced.concat(newMessage));
      onChatComplete(nextMessages);
    },
    onFeedback: (item, feedback) => {},
    onRegenerate: (item) => {
      const indexOf = items.indexOf(item);
      chat(messages.slice(0, indexOf - 1)).then((nextMessages) => onChatComplete(nextMessages));
    },
    onStopGenerating: () => {
      subscription?.unsubscribe();
      setPendingMessage((prevPendingMessage) => ({
        message: {
          role: MessageRole.Assistant,
          ...prevPendingMessage?.message,
        },
        aborted: true,
        error: new AbortError(),
      }));
      setSubscription(undefined);
    },
    onSubmit: async (message) => {
      const nextMessages = await chat(messages.concat(message));
      onChatComplete(nextMessages);
    },
    onActionClick: async (payload) => {
      switch (payload.type) {
        case ChatActionClickType.executeEsqlQuery:
          const nextMessages = await chat(
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
          onChatComplete(nextMessages);
          break;
      }
    },
  };
}
