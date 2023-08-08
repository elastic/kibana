/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, HttpFetchOptions } from '@kbn/core/public';
import { ReadableStream } from 'stream/web';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { ObservabilityAIAssistantService } from '../types';
import { createService } from './create_service';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { lastValueFrom } from 'rxjs';

describe('createService', () => {
  describe('chat', () => {
    let service: ObservabilityAIAssistantService;

    const httpPostSpy = jest.fn();

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

      httpPostSpy.mockResolvedValueOnce(response);
    }

    function chat() {
      return service.chat({ messages: [], connectorId: '' });
    }

    beforeEach(() => {
      service = createService({
        coreStart: {
          http: {
            post: httpPostSpy,
          },
        } as unknown as CoreStart,
        securityStart: {
          authc: {
            getCurrentUser: () => Promise.resolve({ username: 'elastic' } as AuthenticatedUser),
          },
        } as unknown as SecurityPluginStart,
        contextRegistry: new Map(),
        functionRegistry: new Map(),
        enabled: true,
      });
    });

    afterEach(() => {
      httpPostSpy.mockReset();
    });

    it('correctly parses a stream of JSON lines', async () => {
      const chunk1 =
        'data: {"object":"chat.completion.chunk","choices":[{"delta":{"content":"My"}}]}\ndata: {"object":"chat.completion.chunk","choices":[{"delta":{"content":" new"}}]}';
      const chunk2 =
        '\ndata: {"object":"chat.completion.chunk","choices":[{"delta":{"content":" message"}}]}\ndata: [DONE]';

      respondWithChunks({ chunks: [chunk1, chunk2] });

      const response$ = chat();

      const results: any = [];

      const subscription = response$.subscribe({
        next: (data) => results.push(data),
        complete: () => {
          expect(results).toHaveLength(4);
        },
      });

      const value = await lastValueFrom(response$);
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
        'data: {"object":"chat.completion.chunk","choices":[{"delta":{"content":"My"}}]}\ndata: {"object":"chat.completion.chunk","choices":[{"delta":{"content":" new"';
      const chunk2 =
        '}}]}\ndata: {"object":"chat.completion.chunk","choices":[{"delta":{"content":" message"}}]}\ndata: [DONE]';

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

      const value = await lastValueFrom(response$);

      expect(results).toHaveLength(4);

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

      const value = await lastValueFrom(response$);

      expect(value).toEqual({
        aborted: false,
        error: expect.any(Error),
        message: {
          role: 'assistant',
        },
      });
    });

    it('propagates JSON parsing errors', async () => {
      respondWithChunks({ chunks: ['data: {}', 'data: invalid json'] });

      const response$ = chat();

      const value = await lastValueFrom(response$);

      expect(value).toEqual({
        aborted: false,
        error: expect.any(Error),
        message: {
          role: 'assistant',
        },
      });
    });

    it('cancels a running http request when aborted', async () => {
      httpPostSpy.mockImplementationOnce((endpoint: string, options: HttpFetchOptions) => {
        options.signal?.addEventListener('abort', () => {
          expect(options.signal?.aborted).toBeTruthy();
        });
        return Promise.resolve({
          response: {
            status: 200,
            body: new ReadableStream({
              start(controller) {},
            }),
          },
        });
      });

      const response$ = chat();

      await new Promise<void>((resolve, reject) => {
        const subscription = response$.subscribe({});

        setTimeout(() => {
          subscription.unsubscribe();
          resolve();
        }, 100);
      });

      const value = await lastValueFrom(response$);

      expect(value).toEqual({
        message: {
          role: 'assistant',
        },
        aborted: true,
      });
    });
  });
});
