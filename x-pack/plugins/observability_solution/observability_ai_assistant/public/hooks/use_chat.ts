/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { merge } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { NotificationsStart } from '@kbn/core/public';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import {
  MessageRole,
  type Message,
  ConversationCreateEvent,
  ConversationUpdateEvent,
  isTokenLimitReachedError,
  StreamingChatResponseEventType,
} from '../../common';
import type { ObservabilityAIAssistantChatService, ObservabilityAIAssistantService } from '..';
import { useKibana } from './use_kibana';
import { useOnce } from './use_once';

export enum ChatState {
  Ready = 'ready',
  Loading = 'loading',
  Error = 'error',
  Aborted = 'aborted',
}

function getWithSystemMessage(messages: Message[], systemMessage: Message) {
  return [
    systemMessage,
    ...messages.filter((message) => message.message.role !== MessageRole.System),
  ];
}

export interface UseChatResult {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  state: ChatState;
  next: (messages: Message[]) => void;
  stop: () => void;
}

interface UseChatPropsWithoutContext {
  notifications: NotificationsStart;
  initialMessages: Message[];
  initialConversationId?: string;
  service: ObservabilityAIAssistantService;
  chatService: ObservabilityAIAssistantChatService;
  connectorId?: string;
  persist: boolean;
  disableFunctions?: boolean;
  onConversationUpdate?: (event: ConversationCreateEvent | ConversationUpdateEvent) => void;
  onChatComplete?: (messages: Message[]) => void;
  scopes: AssistantScope[];
}

export type UseChatProps = Omit<UseChatPropsWithoutContext, 'notifications'>;

function useChatWithoutContext({
  initialMessages,
  initialConversationId,
  notifications,
  service,
  chatService,
  connectorId,
  onConversationUpdate,
  onChatComplete,
  persist,
  disableFunctions,
  scopes,
}: UseChatPropsWithoutContext): UseChatResult {
  const [chatState, setChatState] = useState(ChatState.Ready);
  const systemMessage = useMemo(() => {
    return chatService.getSystemMessage();
  }, [chatService]);

  useOnce(initialMessages);
  useOnce(initialConversationId);

  const [conversationId, setConversationId] = useState(initialConversationId);

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [pendingMessages, setPendingMessages] = useState<Message[]>();

  const abortControllerRef = useRef(new AbortController());

  const onChatCompleteRef = useRef(onChatComplete);
  onChatCompleteRef.current = onChatComplete;

  const onConversationUpdateRef = useRef(onConversationUpdate);
  onConversationUpdateRef.current = onConversationUpdate;

  const handleSignalAbort = useCallback(() => {
    setChatState(ChatState.Aborted);
  }, []);

  const handleError = useCallback(
    (error: Error) => {
      if (error instanceof AbortError) {
        setChatState(ChatState.Aborted);
        return;
      }

      setChatState(ChatState.Error);

      if (isTokenLimitReachedError(error)) {
        setMessages((msgs) => [
          ...msgs,
          {
            '@timestamp': new Date().toISOString(),
            message: {
              content: i18n.translate('xpack.observabilityAiAssistant.tokenLimitError', {
                defaultMessage:
                  'The conversation has exceeded the token limit. The maximum token limit is **{tokenLimit}**, but the current conversation has **{tokenCount}** tokens. Please start a new conversation to continue.',
                values: { tokenLimit: error.meta?.tokenLimit, tokenCount: error.meta?.tokenCount },
              }),
              role: MessageRole.Assistant,
            },
          },
        ]);

        return;
      }

      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.observabilityAiAssistant.failedToLoadResponse', {
          defaultMessage: 'Failed to load response from the AI Assistant',
        }),
      });
    },
    [notifications.toasts]
  );

  const next = useCallback(
    async (nextMessages: Message[]) => {
      // make sure we ignore any aborts for the previous signal
      abortControllerRef.current.signal.removeEventListener('abort', handleSignalAbort);

      // cancel running requests
      abortControllerRef.current.abort();

      abortControllerRef.current = new AbortController();

      setPendingMessages([]);
      setMessages(nextMessages);

      if (!connectorId || !nextMessages.length) {
        setChatState(ChatState.Ready);
        return;
      }

      setChatState(ChatState.Loading);

      const next$ = chatService.complete({
        getScreenContexts: () => service.getScreenContexts(),
        connectorId,
        messages: getWithSystemMessage(nextMessages, systemMessage),
        persist,
        disableFunctions: disableFunctions ?? false,
        signal: abortControllerRef.current.signal,
        conversationId,
        scopes,
      });

      function getPendingMessages() {
        return [
          ...completedMessages,
          ...(pendingMessage
            ? [
                merge(
                  {
                    message: {
                      role: MessageRole.Assistant,
                      function_call: { trigger: MessageRole.Assistant as const },
                    },
                  },
                  pendingMessage
                ),
              ]
            : []),
        ];
      }

      const completedMessages: Message[] = [];

      let pendingMessage:
        | {
            '@timestamp': string;
            message: { content: string; function_call: { name: string; arguments: string } };
          }
        | undefined;

      const subscription = next$.subscribe({
        next: (event) => {
          switch (event.type) {
            case StreamingChatResponseEventType.ChatCompletionChunk:
              if (!pendingMessage) {
                pendingMessage = {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    content: event.message.content || '',
                    function_call: {
                      name: event.message.function_call?.name || '',
                      arguments: event.message.function_call?.arguments || '',
                    },
                  },
                };
              } else {
                pendingMessage.message.content += event.message.content || '';
                pendingMessage.message.function_call.name +=
                  event.message.function_call?.name || '';
                pendingMessage.message.function_call.arguments +=
                  event.message.function_call?.arguments || '';
              }
              break;

            case StreamingChatResponseEventType.MessageAdd:
              pendingMessage = undefined;
              completedMessages.push(event.message);
              break;

            case StreamingChatResponseEventType.ConversationCreate:
              setConversationId(event.conversation.id);
              onConversationUpdateRef.current?.(event);
              break;
            case StreamingChatResponseEventType.ConversationUpdate:
              onConversationUpdateRef.current?.(event);
              break;
          }
          setPendingMessages(getPendingMessages());
        },
        complete: () => {
          setChatState(ChatState.Ready);
          const completed = nextMessages.concat(completedMessages);
          setMessages(completed);
          setPendingMessages([]);
          onChatCompleteRef.current?.(completed);
        },
        error: (error) => {
          setPendingMessages([]);
          setMessages(nextMessages.concat(getPendingMessages()));
          handleError(error);
        },
      });

      abortControllerRef.current.signal.addEventListener('abort', () => {
        handleSignalAbort();
        subscription.unsubscribe();
      });
    },
    [
      chatService,
      connectorId,
      conversationId,
      handleError,
      handleSignalAbort,
      persist,
      disableFunctions,
      service,
      systemMessage,
      scopes,
    ]
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current.abort();
    };
  }, []);

  const memoizedMessages = useMemo(() => {
    return getWithSystemMessage(messages.concat(pendingMessages ?? []), systemMessage);
  }, [systemMessage, messages, pendingMessages]);

  const setMessagesWithAbort = useCallback((nextMessages: Message[]) => {
    abortControllerRef.current.abort();
    setPendingMessages([]);
    setChatState(ChatState.Ready);
    setMessages(nextMessages);
  }, []);

  return {
    messages: memoizedMessages,
    setMessages: setMessagesWithAbort,
    state: chatState,
    next,
    stop: () => {
      abortControllerRef.current.abort();
    },
  };
}

export function useChat(props: UseChatProps) {
  const {
    services: { notifications },
  } = useKibana();

  return useChatWithoutContext({
    ...props,
    notifications,
  });
}

export function createUseChat({ notifications }: { notifications: NotificationsStart }) {
  return (parameters: Omit<UseChatProps, 'notifications'>) => {
    return useChatWithoutContext({
      ...parameters,
      notifications,
    });
  };
}
