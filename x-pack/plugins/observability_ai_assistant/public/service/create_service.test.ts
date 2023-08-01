/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core/public';
import { ReadableStream } from 'stream/web';
import { ObservabilityAIAssistantService } from '../types';
import { createService } from './create_service';

describe('createService', () => {
  describe('chat', () => {
    let service: ObservabilityAIAssistantService;

    const httpPostSpy = jest.fn();

    function respondWithChunks({ chunks, status = 200 }: { status?: number; chunks: string[][] }) {
      const response = {
        response: {
          status,
          body: new ReadableStream({
            start(controller) {
              chunks.forEach((chunk) => {
                controller.enqueue(new TextEncoder().encode(chunk.join('\n')));
              });
              controller.close();
            },
          }),
        },
      };

      httpPostSpy.mockResolvedValueOnce(response);
    }

    async function chat(signal: AbortSignal = new AbortController().signal) {
      const response = await service.chat({ messages: [], connectorId: '', signal });

      return response;
    }

    beforeEach(() => {
      service = createService({
        http: {
          post: httpPostSpy,
        },
      } as unknown as CoreStart);
    });

    afterEach(() => {
      httpPostSpy.mockReset();
    });

    it('correctly parses a stream of JSON lines', async () => {
      const chunk1 = ['data: {}', 'data: {}'];
      const chunk2 = ['data: {}', 'data: [DONE]'];

      respondWithChunks({ chunks: [chunk1, chunk2] });

      const response$ = await chat();

      const results: any = [];
      response$.subscribe({
        next: (data) => results.push(data),
        complete: () => {
          expect(results).toHaveLength(3);
        },
      });
    });

    it('correctly buffers partial lines', async () => {
      const chunk1 = ['data: {}', 'data: {'];
      const chunk2 = ['}', 'data: [DONE]'];

      respondWithChunks({ chunks: [chunk1, chunk2] });

      const response$ = await chat();

      const results: any = [];
      response$.subscribe({
        next: (data) => results.push(data),
        complete: () => {
          expect(results).toHaveLength(2);
        },
      });
    });

    it('propagates invalid requests as an error', () => {
      respondWithChunks({ status: 400, chunks: [] });

      expect(() => chat()).rejects.toThrowErrorMatchingInlineSnapshot(`"Unexpected error"`);
    });

    it('propagates JSON parsing errors', async () => {
      const chunk1 = ['data: {}', 'data: invalid json'];

      respondWithChunks({ chunks: [chunk1] });

      const response$ = await chat();

      response$.subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(SyntaxError);
        },
      });
    });
  });
});
