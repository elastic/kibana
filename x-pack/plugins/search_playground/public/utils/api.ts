/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { readDataStream } from './stream';
import { Annotation, Message, MessageRole } from '../types';

export async function fetchApi({
  api,
  messages,
  body,
  headers,
  abortController,
  handleFailure,
  onUpdate,
}: {
  api: string | ((init: RequestInit) => Promise<Response>);
  messages: Array<Omit<Message, 'id'>>;
  body: Record<string, any>;
  headers?: HeadersInit;
  appendMessage: (message: Message) => void;
  abortController?: () => AbortController | null;
  handleFailure: () => void;
  onUpdate: (mergedMessages: Message[]) => void;
}) {
  const requestInit = {
    method: 'POST',
    body: JSON.stringify({
      messages,
      ...body,
    }),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal: abortController?.()?.signal,
  };

  const apiRequest = typeof api === 'string' ? fetch(api, requestInit) : api(requestInit);

  const apiResponse = await apiRequest.catch(async (error) => {
    handleFailure();
    let errorMessage = 'Failed to fetch the chat messages';
    if (error.response) {
      errorMessage =
        (await error.response?.json())?.message ?? 'Failed to fetch the chat response.';
    }
    throw new Error(errorMessage);
  });

  if (!apiResponse.body) {
    throw new Error('The response body is empty.');
  }

  const reader = apiResponse.body.getReader();

  return await parseDataStream({
    reader,
    abortControllerRef: abortController != null ? { current: abortController() } : undefined,
    update: onUpdate,
  });
}

interface PrefixMap {
  text?: Message;
}

function assignAnnotationsToMessage<T extends Message | null | undefined>(
  message: T,
  annotations: Annotation[] | undefined
): T {
  if (!message || !annotations || !annotations.length) return message;
  return { ...message, annotations: [...annotations] } as T;
}

export async function parseDataStream({
  reader,
  abortControllerRef,
  update,
  generateId = uuidv4,
  getCurrentDate = () => new Date(),
}: {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  abortControllerRef?: {
    current: AbortController | null;
  };
  update: (mergedMessages: Message[]) => void;
  generateId?: () => string;
  getCurrentDate?: () => Date;
}) {
  const createdAt = getCurrentDate();
  const prefixMap: PrefixMap = {};
  let messageAnnotations: Annotation[] | undefined;

  for await (const { type, value } of readDataStream(reader, {
    isAborted: () => abortControllerRef?.current === null,
  })) {
    if (type === 'text') {
      if (prefixMap.text) {
        prefixMap.text = {
          ...prefixMap.text,
          content: (prefixMap.text.content || '') + value,
        };
      } else {
        prefixMap.text = {
          id: generateId(),
          role: MessageRole.assistant,
          content: value,
          createdAt,
        };
      }
    }

    let responseMessage = prefixMap.text;

    if (type === 'message_annotations') {
      if (!messageAnnotations) {
        messageAnnotations = [...(value as unknown as Annotation[])];
      } else {
        messageAnnotations.push(...(value as unknown as Annotation[]));
      }

      responseMessage = assignAnnotationsToMessage(prefixMap.text, messageAnnotations);
    }

    if (messageAnnotations?.length) {
      const messagePrefixKeys: Array<keyof PrefixMap> = ['text'];
      messagePrefixKeys.forEach((key) => {
        if (prefixMap[key]) {
          (prefixMap[key] as Message).annotations = [...messageAnnotations!];
        }
      });
    }

    const mergedMessages = [responseMessage].filter(Boolean).map((message) => ({
      ...assignAnnotationsToMessage(message, messageAnnotations),
    })) as Message[];

    update(mergedMessages);
  }

  return {
    messages: [prefixMap.text].filter(Boolean) as Message[],
  };
}
