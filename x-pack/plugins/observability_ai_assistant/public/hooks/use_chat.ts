/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { merge } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageRole, type Message } from '../../common';
import {
  ConversationCreateEvent,
  ConversationUpdateEvent,
  StreamingChatResponseEventType,
} from '../../common/conversation_complete';
import { getAssistantSetupMessage } from '../service/get_assistant_setup_message';
import type { ObservabilityAIAssistantChatService } from '../types';
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

export interface UseChatProps {
  initialMessages: Message[];
  initialConversationId?: string;
  chatService: ObservabilityAIAssistantChatService;
  connectorId?: string;
  persist: boolean;
  onConversationUpdate?: (event: ConversationCreateEvent | ConversationUpdateEvent) => void;
  onChatComplete?: (messages: Message[]) => void;
}

export function useChat({
  initialMessages,
  initialConversationId,
  chatService,
  connectorId,
  onConversationUpdate,
  onChatComplete,
  persist,
}: UseChatProps): UseChatResult {
  const [chatState, setChatState] = useState(ChatState.Ready);

  const systemMessage = useMemo(() => {
    return getAssistantSetupMessage({ contexts: chatService.getContexts() });
  }, [chatService]);

  useOnce(initialMessages);

  useOnce(initialConversationId);

  const [conversationId, setConversationId] = useState(initialConversationId);

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [pendingMessages, setPendingMessages] = useState<Message[]>();

  const abortControllerRef = useRef(new AbortController());

  const {
    services: { notifications },
  } = useKibana();

  const onChatCompleteRef = useRef(onChatComplete);
  onChatCompleteRef.current = onChatComplete;

  const onConversationUpdateRef = useRef(onConversationUpdate);
  onConversationUpdateRef.current = onConversationUpdate;

  const handleSignalAbort = useCallback(() => {
    setChatState(ChatState.Aborted);
  }, []);

  const handleError = useCallback(
    (error: Error) => {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.observabilityAiAssistant.failedToLoadResponse', {
          defaultMessage: 'Failed to load response from the AI Assistant',
        }),
      });
      setChatState(ChatState.Error);
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
        connectorId,
        messages: getWithSystemMessage(nextMessages, systemMessage),
        persist,
        signal: abortControllerRef.current.signal,
        conversationId,
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
      connectorId,
      chatService,
      handleSignalAbort,
      systemMessage,
      handleError,
      persist,
      conversationId,
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
