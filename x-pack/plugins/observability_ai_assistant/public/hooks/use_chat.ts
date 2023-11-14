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

export enum ChatState {
  Ready = 'ready',
  Loading = 'loading',
  Error = 'error',
  Aborted = 'aborted',
}

interface UseChatResult {
  messages: Message[];
  state: ChatState;
  next: (messages: Message[]) => void;
  stop: () => void;
}

export function useChat({
  initialMessages,
  chatService,
  connectorId,
}: {
  initialMessages: Message[];
  chatService: ObservabilityAIAssistantChatService;
  connectorId: string;
}): UseChatResult {
  const [chatState, setChatState] = useState(ChatState.Ready);

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [pendingMessage, setPendingMessage] = useState<PendingMessage>();

  const abortControllerRef = useRef(new AbortController());

  const {
    services: { notifications },
  } = useKibana();

  const handleSignalAbort = useCallback(() => {
    setChatState(ChatState.Aborted);
  }, []);

  async function next(nextMessages: Message[]) {
    abortControllerRef.current.signal.removeEventListener('abort', handleSignalAbort);

    const lastMessage = last(nextMessages);

    if (!lastMessage) {
      setChatState(ChatState.Ready);
      return;
    }

    const isUserMessage = lastMessage.message.role === MessageRole.User;
    const functionCall = lastMessage.message.function_call;
    const isAssistantMessageWithFunctionRequest =
      lastMessage.message.role === MessageRole.Assistant && functionCall && !!functionCall?.name;

    if (!isUserMessage && !isAssistantMessageWithFunctionRequest) {
      setChatState(ChatState.Ready);
      return;
    }

    const abortController = (abortControllerRef.current = new AbortController());

    abortController.signal.addEventListener('abort', handleSignalAbort);

    setChatState(ChatState.Loading);

    const allMessages = [
      getAssistantSetupMessage({ contexts: chatService.getContexts() }),
      ...nextMessages.filter((message) => message.message.role !== MessageRole.System),
    ];

    function handleError(error: Error) {
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
              content: JSON.stringify({
                message: error.toString(),
                error,
              }),
              data: undefined,
            };
          })
      : chatService.chat({
          messages: allMessages,
          connectorId,
        });

    if (isObservable(response)) {
      const localPendingMessage = pendingMessage!;
      const subscription = response.subscribe({
        next: (nextPendingMessage) => {
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
          setMessages(allMessagesWithResolved);
          if (localPendingMessage.aborted) {
            setChatState(ChatState.Aborted);
          } else if (localPendingMessage.error) {
            handleError(localPendingMessage.error);
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
  }

  useEffect(() => {
    return () => {
      abortControllerRef.current.abort();
    };
  }, []);

  const memoizedMessages = useMemo(() => {
    return pendingMessage
      ? messages.concat({ ...pendingMessage, '@timestamp': new Date().toISOString() })
      : messages;
  }, [messages, pendingMessage]);

  return {
    messages: memoizedMessages,
    state: chatState,
    next,
    stop: () => {
      abortControllerRef.current.abort();
    },
  };
}
