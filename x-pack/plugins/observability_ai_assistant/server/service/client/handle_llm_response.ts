/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { v4 } from 'uuid';
import { Message, MessageRole } from '../../../common';
import {
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
} from '../../../common/conversation_complete';
import type { CreateChatCompletionResponseChunk } from '../../../common/types';

export function handleLlmResponse({
  signal,
  write,
  source$,
}: {
  signal: AbortSignal;
  write: (event: StreamingChatResponseEvent) => Promise<void>;
  source$: Observable<CreateChatCompletionResponseChunk>;
}): Promise<{ id: string; message: Message['message'] }> {
  return new Promise<{ message: Message['message']; id: string }>((resolve, reject) => {
    const message = {
      content: '',
      role: MessageRole.Assistant,
      function_call: { name: '', arguments: '', trigger: MessageRole.Assistant as const },
    };

    const id = v4();
    const subscription = source$.subscribe({
      next: (chunk) => {
        const delta = chunk.choices[0].delta;

        message.content += delta.content || '';
        message.function_call.name += delta.function_call?.name || '';
        message.function_call.arguments += delta.function_call?.arguments || '';

        write({
          type: StreamingChatResponseEventType.ChatCompletionChunk,
          message: delta,
          id,
        });
      },
      complete: () => {
        resolve({ id, message });
      },
      error: (error) => {
        reject(error);
      },
    });

    signal.addEventListener('abort', () => {
      subscription.unsubscribe();
      reject(new Error('Request aborted'));
    });
  }).then(async ({ id, message }) => {
    await write({
      type: StreamingChatResponseEventType.MessageAdd,
      message: {
        '@timestamp': new Date().toISOString(),
        message,
      },
      id,
    });
    return { id, message };
  });
}
