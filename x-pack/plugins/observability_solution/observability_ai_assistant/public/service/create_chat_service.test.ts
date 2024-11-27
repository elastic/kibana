/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core/public';
import { BehaviorSubject, filter, lastValueFrom, Observable } from 'rxjs';
import { ReadableStream } from 'stream/web';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import {
  ChatCompletionChunkEvent,
  ChatCompletionError,
  StreamingChatResponseEventType,
  StreamingChatResponseEventWithoutError,
} from '../../common/conversation_complete';
import { concatenateChatCompletionChunks } from '../../common/utils/concatenate_chat_completion_chunks';
import type { ObservabilityAIAssistantChatService } from '../types';
import { createChatService } from './create_chat_service';
import { AssistantScope } from '@kbn/ai-assistant-common';

async function getConcatenatedMessage(
  response$: Observable<StreamingChatResponseEventWithoutError>
) {
  return await lastValueFrom(
    response$.pipe(
      filter(
        (event): event is ChatCompletionChunkEvent =>
          event.type === StreamingChatResponseEventType.ChatCompletionChunk
      ),
      concatenateChatCompletionChunks()
    )
  );
}

describe('createChatService', () => {
  let service: ObservabilityAIAssistantChatService;
  const clientSpy = jest.fn();

  function respondWithChunks({ chunks, status = 200 }: { status?: number; chunks: string[] }) {
    const response = {
      response: {
        status,
        body: new ReadableStream({
          start(controller) {
            chunks.forEach((chunk) => {
              controller.enqueue(new TextEncoder().encode(chunk));
            });
            controller.close();
          },
        }),
      },
    };

    clientSpy.mockResolvedValueOnce(response);
  }

  beforeEach(async () => {
    clientSpy.mockImplementation(async () => {
      return {
        functionDefinitions: [],
        contextDefinitions: [],
      };
    });
    service = await createChatService({
      analytics: {
        optIn: () => {},
        reportEvent: () => {},
        telemetryCounter$: new Observable(),
      },
      apiClient: clientSpy,
      registrations: [],
      signal: new AbortController().signal,
      scope$: new BehaviorSubject<AssistantScope[]>(['observability']),
    });
  });

  afterEach(() => {
    clientSpy.mockReset();
  });

  describe('chat', () => {
    function chat({ signal }: { signal: AbortSignal } = { signal: new AbortController().signal }) {
      return service.chat('my_test', {
        signal,
        messages: [],
        connectorId: '',
        scopes: ['observability'],
      });
    }

    it('correctly parses a stream of JSON lines', async () => {
      const chunk1 =
        '{"id":"my-id","type":"chatCompletionChunk","message":{"content":"My"}}\n{"id":"my-id","type":"chatCompletionChunk","message":{"content":" new"}}';
      const chunk2 =
        '\n{"id":"my-id","type":"chatCompletionChunk","message":{"content":" message"}}';

      respondWithChunks({ chunks: [chunk1, chunk2] });

      const response$ = chat();

      const results: any = [];

      const subscription = response$.subscribe({
        next: (data) => results.push(data),
        complete: () => {
          expect(results).toHaveLength(3);
        },
      });

      const value = await getConcatenatedMessage(response$);

      subscription.unsubscribe();

      expect(value).toEqual({
        message: {
          role: 'assistant',
          content: 'My new message',
          function_call: {
            arguments: '',
            name: '',
            trigger: 'assistant',
          },
        },
      });
    });

    it('correctly buffers partial lines', async () => {
      const chunk1 =
        '{"id":"my-id","type":"chatCompletionChunk","message":{"content":"My"}}\n{"id":"my-id","type":"chatCompletionChunk","message":{"content":" new"';
      const chunk2 =
        '}}\n{"id":"my-id","type":"chatCompletionChunk","message":{"content":" message"}}';

      respondWithChunks({ chunks: [chunk1, chunk2] });

      const response$ = chat();

      const results: any = [];

      await new Promise<void>((resolve, reject) => {
        response$.subscribe({
          next: (data) => {
            results.push(data);
          },
          error: reject,
          complete: resolve,
        });
      });

      const value = await getConcatenatedMessage(response$);

      expect(results).toHaveLength(3);

      expect(value).toEqual({
        message: {
          role: 'assistant',
          content: 'My new message',
          function_call: {
            arguments: '',
            name: '',
            trigger: 'assistant',
          },
        },
      });
    });

    it('catches invalid requests and flags it as an error', async () => {
      respondWithChunks({ status: 400, chunks: [] });

      const response$ = chat();

      await expect(async () => {
        await getConcatenatedMessage(response$);
      }).rejects.toBeDefined();
    });

    it('propagates JSON parsing errors', async () => {
      respondWithChunks({ chunks: ['{}', 'invalid json'] });

      const response$ = chat();

      await expect(async () => {
        await getConcatenatedMessage(response$);
      }).rejects.toBeDefined();
    });

    it('propagates content errors', async () => {
      respondWithChunks({
        chunks: [
          `{"type": "chatCompletionError", "error":{"message":"The server had an error while processing your request. Sorry about that!","type":"server_error","param":null,"code":null}}`,
        ],
      });

      const response$ = chat();

      const matcher = await expect(async () => {
        await getConcatenatedMessage(response$);
      }).rejects;

      matcher.toEqual(expect.any(ChatCompletionError));

      matcher.toHaveProperty(
        'message',
        'The server had an error while processing your request. Sorry about that!'
      );
    });

    it('cancels a running http request when aborted', async () => {
      await expect(
        () =>
          new Promise<void>((resolve, reject) => {
            clientSpy.mockImplementationOnce((endpoint: string, options: HttpFetchOptions) => {
              return Promise.resolve({
                response: {
                  status: 200,
                  body: new ReadableStream({
                    start(controller) {},
                  }),
                },
              });
            });

            const controller = new AbortController();

            chat({
              signal: controller.signal,
            }).subscribe({
              complete: resolve,
              error: reject,
            });

            setTimeout(() => {
              controller.abort();
            }, 0);
          })
      ).rejects.toEqual(expect.any(AbortError));
    });
  });
});
