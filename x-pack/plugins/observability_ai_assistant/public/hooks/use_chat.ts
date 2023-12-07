/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { last } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isObservable } from 'rxjs';
import { type Message, MessageRole } from '../../common';
import { getAssistantSetupMessage } from '../service/get_assistant_setup_message';
import type { ObservabilityAIAssistantChatService, PendingMessage } from '../types';
import { useKibana } from './use_kibana';
import { useOnce } from './use_once';

export enum ChatState {
  Ready = 'ready',
  Loading = 'loading',
  Error = 'error',
  Aborted = 'aborted',
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
  chatService: ObservabilityAIAssistantChatService;
  connectorId?: string;
  onChatComplete?: (messages: Message[]) => void;
}

export function useChat({
  initialMessages,
  chatService,
  connectorId,
  onChatComplete,
}: UseChatProps): UseChatResult {
  const [chatState, setChatState] = useState(ChatState.Ready);

  const systemMessage = useMemo(() => {
    return getAssistantSetupMessage({ contexts: chatService.getContexts() });
  }, [chatService]);

  useOnce(initialMessages);

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [pendingMessage, setPendingMessage] = useState<PendingMessage>();

  const abortControllerRef = useRef(new AbortController());

  const {
    services: { notifications },
  } = useKibana();

  const onChatCompleteRef = useRef(onChatComplete);

  onChatCompleteRef.current = onChatComplete;

  const handleSignalAbort = useCallback(() => {
    setChatState(ChatState.Aborted);
  }, []);

  const next = useCallback(
    async (nextMessages: Message[]) => {
      // make sure we ignore any aborts for the previous signal
      abortControllerRef.current.signal.removeEventListener('abort', handleSignalAbort);

      // cancel running requests
      abortControllerRef.current.abort();

      const lastMessage = last(nextMessages);

      const allMessages = [
        systemMessage,
        ...nextMessages.filter((message) => message.message.role !== MessageRole.System),
      ];

      setMessages(allMessages);

      if (!lastMessage || !connectorId) {
        setChatState(ChatState.Ready);
        onChatCompleteRef.current?.(nextMessages);
        return;
      }

      const isUserMessage = lastMessage.message.role === MessageRole.User;
      const functionCall = lastMessage.message.function_call;
      const isAssistantMessageWithFunctionRequest =
        lastMessage.message.role === MessageRole.Assistant && functionCall && !!functionCall.name;

      const isFunctionResult = isUserMessage && !!lastMessage.message.name;

      const isRecallFunctionAvailable = chatService.hasFunction('recall');

      if (!isUserMessage && !isAssistantMessageWithFunctionRequest) {
        setChatState(ChatState.Ready);
        onChatCompleteRef.current?.(nextMessages);
        return;
      }

      const abortController = (abortControllerRef.current = new AbortController());

      abortController.signal.addEventListener('abort', handleSignalAbort);

      setChatState(ChatState.Loading);

      if (isUserMessage && !isFunctionResult && isRecallFunctionAvailable) {
        const allMessagesWithRecall = allMessages.concat({
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.Assistant,
            content: '',
            function_call: {
              name: 'recall',
              arguments: JSON.stringify({ queries: [], contexts: [] }),
              trigger: MessageRole.Assistant,
            },
          },
        });
        next(allMessagesWithRecall);
        return;
      }

      function handleError(error: Error) {
        setChatState(ChatState.Error);
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.observabilityAiAssistant.failedToLoadResponse', {
            defaultMessage: 'Failed to load response from the AI Assistant',
          }),
        });
      }

      const response = isAssistantMessageWithFunctionRequest
        ? await chatService
            .executeFunction({
              name: functionCall.name,
              signal: abortController.signal,
              args: functionCall.arguments,
              connectorId,
              messages: allMessages,
            })
            .catch((error) => {
              return {
                content: {
                  message: error.toString(),
                  error,
                },
                data: undefined,
              };
            })
        : chatService.chat({
            messages: allMessages,
            connectorId,
          });

      if (abortController.signal.aborted) {
        return;
      }

      if (isObservable(response)) {
        let localPendingMessage: PendingMessage = {
          message: {
            content: '',
            role: MessageRole.User,
          },
        };

        const subscription = response.subscribe({
          next: (nextPendingMessage) => {
            localPendingMessage = nextPendingMessage;
            setPendingMessage(nextPendingMessage);
          },
          complete: () => {
            setPendingMessage(undefined);
            const allMessagesWithResolved = allMessages.concat({
              message: {
                ...localPendingMessage.message,
              },
              '@timestamp': new Date().toISOString(),
            });
            if (localPendingMessage.aborted) {
              setChatState(ChatState.Aborted);
              setMessages(allMessagesWithResolved);
            } else if (localPendingMessage.error) {
              handleError(localPendingMessage.error);
              setMessages(allMessagesWithResolved);
            } else {
              next(allMessagesWithResolved);
            }
          },
          error: (error) => {
            handleError(error);
          },
        });

        abortController.signal.addEventListener('abort', () => {
          subscription.unsubscribe();
        });
      } else {
        const allMessagesWithFunctionReply = allMessages.concat({
          '@timestamp': new Date().toISOString(),
          message: {
            name: functionCall!.name,
            role: MessageRole.User,
            content: JSON.stringify(response.content),
            data: JSON.stringify(response.data),
          },
        });
        next(allMessagesWithFunctionReply);
      }
    },
    [connectorId, chatService, handleSignalAbort, notifications.toasts, systemMessage]
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current.abort();
    };
  }, []);

  const memoizedMessages = useMemo(() => {
    const includingSystemMessage = [
      systemMessage,
      ...messages.filter((message) => message.message.role !== MessageRole.System),
    ];

    return pendingMessage
      ? includingSystemMessage.concat({
          ...pendingMessage,
          '@timestamp': new Date().toISOString(),
        })
      : includingSystemMessage;
  }, [systemMessage, messages, pendingMessage]);

  const setMessagesWithAbort = useCallback((nextMessages: Message[]) => {
    abortControllerRef.current.abort();
    setPendingMessage(undefined);
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
