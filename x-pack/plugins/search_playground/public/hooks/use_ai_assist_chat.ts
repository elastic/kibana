/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR, { KeyedMutator } from 'swr';
import { v4 as uuidv4 } from 'uuid';
import { fetchApi } from '../utils/api';

import type {
  ChatRequest,
  ChatRequestOptions,
  CreateMessage,
  Message,
  UseChatHelpers,
  UseChatOptions,
} from '../types';
import { MessageRole } from '../types';

const getStreamedResponse = async (
  api: string | ((init: RequestInit) => Promise<Response>),
  chatRequest: ChatRequest,
  mutate: KeyedMutator<Message[]>,
  extraMetadataRef: React.MutableRefObject<any>,
  messagesRef: React.MutableRefObject<Message[]>,
  abortControllerRef: React.MutableRefObject<AbortController | null>
) => {
  const previousMessages = messagesRef.current;
  mutate(chatRequest.messages, false);

  const constructedMessagesPayload = chatRequest.messages.map(({ role, content }) => ({
    role,
    content,
  }));

  return await fetchApi({
    api,
    messages: constructedMessagesPayload,
    body: {
      data: chatRequest.data,
      ...extraMetadataRef.current.body,
      ...chatRequest.options?.body,
    },
    headers: {
      ...extraMetadataRef.current.headers,
      ...chatRequest.options?.headers,
    },
    abortController: () => abortControllerRef.current,
    appendMessage(message) {
      mutate([...chatRequest.messages, message], false);
    },
    handleFailure(errorMessage) {
      const systemErrorMessage = {
        id: uuidv4(),
        content: errorMessage,
        role: MessageRole.system,
        createdAt: new Date(),
      };
      // concating the last question and error message with existing chat history
      mutate([...previousMessages, chatRequest.messages.slice(-1)[0], systemErrorMessage], false);
    },
    onUpdate(merged) {
      mutate([...chatRequest.messages, ...merged], false);
    },
  });
};

export function useAIAssistChat({
  api = '/api/chat',
  id = 'chat',
  initialInput = '',
  onError,
  headers,
  body,
}: UseChatOptions & {
  key?: string;
} = {}): UseChatHelpers {
  const chatKey = [typeof api === 'string' ? api : 'function', id];

  const [initialMessagesFallback] = useState([]);

  // Store the chat state in SWR, using the chatId as the key to share states.
  const { data: messages, mutate } = useSWR<Message[]>([chatKey, 'messages'], null, {
    fallbackData: initialMessagesFallback,
  });

  const { data: isLoading = false, mutate: mutateLoading } = useSWR<boolean>(
    [chatKey, 'loading'],
    null
  );

  const { data: error = undefined, mutate: setError } = useSWR<undefined | Error>(
    [chatKey, 'error'],
    null
  );

  const messagesRef = useRef<Message[]>(messages || []);
  useEffect(() => {
    messagesRef.current = messages || [];
  }, [messages]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const extraMetadataRef = useRef({
    headers,
    body,
  });

  useEffect(() => {
    extraMetadataRef.current = {
      headers,
      body,
    };
  }, [headers, body]);

  const triggerRequest = useCallback(
    async (chatRequest: ChatRequest) => {
      try {
        mutateLoading(true);
        setError(undefined);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        await getStreamedResponse(
          api,
          chatRequest,
          mutate,
          extraMetadataRef,
          messagesRef,
          abortControllerRef
        );

        abortControllerRef.current = null;
      } catch (err) {
        if ((err as any).name === 'AbortError') {
          abortControllerRef.current = null;
          return null;
        }

        if (onError && err instanceof Error) {
          onError(err);
        }

        setError(err as Error);
      } finally {
        mutateLoading(false);
      }
    },
    [
      mutate,
      mutateLoading,
      api,
      extraMetadataRef,
      onError,
      setError,
      messagesRef,
      abortControllerRef,
    ]
  );

  const append = useCallback(
    async (message: Message | CreateMessage, { options, data }: ChatRequestOptions = {}) => {
      if (!message.id) {
        message.id = uuidv4();
      }

      const chatRequest: ChatRequest = {
        messages: messagesRef.current.concat(message as Message),
        options,
        data,
      };

      return triggerRequest(chatRequest);
    },
    [triggerRequest]
  );

  const reload = useCallback(
    async ({ options, data }: ChatRequestOptions = {}) => {
      if (messagesRef.current.length === 0) return null;

      const chatRequest: ChatRequest = {
        messages: messagesRef.current.slice(0, messagesRef.current.length - 1),
        options,
        data,
      };

      return triggerRequest(chatRequest);
    },
    [triggerRequest]
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const setMessages = useCallback(
    (newMessages: Message[]) => {
      mutate(newMessages, false);
      messagesRef.current = newMessages;
    },
    [mutate]
  );

  const [input, setInput] = useState(initialInput);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>, options: ChatRequestOptions = {}, metadata?: unknown) => {
      if (metadata) {
        extraMetadataRef.current = {
          ...extraMetadataRef.current,
          ...metadata,
        };
      }

      e.preventDefault();
      if (!input) return;

      append(
        {
          content: input,
          role: MessageRole.user,
          createdAt: new Date(),
        },
        options
      );
      setInput('');
    },
    [input, append]
  );

  const handleInputChange = (e: any) => {
    setInput(e.target.value);
  };

  return {
    messages: messages || [],
    error,
    append,
    reload,
    stop,
    setMessages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
  };
}
