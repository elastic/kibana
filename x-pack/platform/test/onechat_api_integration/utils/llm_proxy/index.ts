/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import getPort from 'get-port';
import http, { type Server } from 'http';
import { isString, once, pull, isFunction } from 'lodash';
import pRetry from 'p-retry';
import type { ChatCompletionChunkToolCall } from '@kbn/inference-common';
import type { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { createInterceptors } from './interceptors';
import { createOpenAiChunk } from './create_openai_chunk';

type Request = http.IncomingMessage;
type Response = http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage };

type LLMMessage = string[] | ToolMessage | string | undefined;

type RequestHandler = (
  request: Request,
  response: Response,
  requestBody: ChatCompletionStreamParams
) => LLMMessage;

interface RequestInterceptor {
  name: string;
  when: (body: ChatCompletionStreamParams) => boolean;
}

export interface ToolMessage {
  role: 'assistant';
  content?: string;
  tool_calls?: ChatCompletionChunkToolCall[];
}

export interface LlmResponseSimulator {
  requestBody: ChatCompletionStreamParams;
  status: (code: number) => void;
  next: (msg: string | ToolMessage) => Promise<void>;
  error: (error: any) => Promise<void>;
  complete: () => Promise<void>;
  rawWrite: (chunk: string) => Promise<void>;
  rawEnd: () => Promise<void>;
}

export class LlmProxy {
  server: Server;
  interval: NodeJS.Timeout;
  private requestInterceptors: Array<RequestInterceptor & { handle: RequestHandler }> = [];
  // Public interceptor helper API
  interceptors: ReturnType<typeof createInterceptors>;
  interceptedRequests: Array<{
    requestBody: ChatCompletionStreamParams;
    matchingInterceptorName: string | undefined;
  }> = [];

  constructor(private readonly port: number, private readonly log: ToolingLog) {
    this.interval = setInterval(() => this.log.debug(`LLM proxy listening on port ${port}`), 5000);

    this.server = http
      .createServer()
      .on('request', async (request, response) => {
        const requestBody = await getRequestBody(request);

        const matchingInterceptor = this.requestInterceptors.find(({ when }) => when(requestBody));
        this.interceptedRequests.push({
          requestBody,
          matchingInterceptorName: matchingInterceptor?.name,
        });

        const compressedConversation = requestBody.messages.map((m) => {
          return { ...m, content: m.role === 'system' ? m.content?.slice(0, 200) : m.content };
        });

        // @ts-expect-error
        const toolChoice = requestBody.tool_choice?.function.name;
        const availableToolNames = requestBody.tools?.map(({ function: fn }) => fn.name);

        this.log.info(`Outgoing conversation "${JSON.stringify(compressedConversation, null, 2)}"`);
        this.log.info(`Tools: ${JSON.stringify(availableToolNames, null, 2)}`);
        if (toolChoice) {
          this.log.info(`Tool choice: ${toolChoice}`);
        }

        if (matchingInterceptor) {
          const mockedLlmResponse = matchingInterceptor.handle(request, response, requestBody);
          this.log.info(`Mocked LLM response: ${JSON.stringify(mockedLlmResponse, null, 2)}`);
          pull(this.requestInterceptors, matchingInterceptor);
          return;
        }

        const errorMessage = `No interceptors found to handle request: ${request.method} ${request.url}`;
        this.log.warning(errorMessage);

        this.log.warning(
          `Available interceptors: ${JSON.stringify(
            this.requestInterceptors.map(({ name, when }) => ({
              name,
              when: when.toString(),
            })),
            null,
            2
          )}`
        );

        response.writeHead(500, {
          'Elastic-Interceptor': 'Interceptor not found',
        });
        response.write(
          sseEvent({
            errorMessage,
            availableInterceptors: this.requestInterceptors.map(({ name }) => name),
          })
        );
        response.end();
      })
      .on('error', (error) => {
        this.log.error(`LLM proxy encountered an error: ${error}`);
      })
      .listen(port);

    // Initialize helper API
    this.interceptors = createInterceptors(this);
  }

  getPort() {
    return this.port;
  }

  clear() {
    this.requestInterceptors = [];
    this.interceptedRequests = [];
  }

  close() {
    this.log.debug(`Closing LLM Proxy on port ${this.port}`);
    clearInterval(this.interval);
    this.server.close();
    this.clear();
  }

  waitForAllInterceptorsToHaveBeenCalled() {
    return pRetry(
      async () => {
        if (this.requestInterceptors.length === 0) {
          return;
        }

        const unsettledInterceptors = this.requestInterceptors.map((i) => i.name);
        this.log.debug(
          `Waiting for the following interceptors to be called: ${JSON.stringify(
            unsettledInterceptors
          )}`
        );
        if (this.requestInterceptors.length > 0) {
          throw new Error(
            `Interceptors were not called: ${unsettledInterceptors.map((name) => `\n - ${name}`)}
`
          );
        }
      },
      { retries: 5, maxTimeout: 1000 }
    ).catch((error) => {
      this.clear();
      throw error;
    });
  }

  intercept({
    name,
    when,
    responseMock,
  }: {
    name: string;
    when: RequestInterceptor['when'];
    responseMock?: LLMMessage | ((body: ChatCompletionStreamParams) => LLMMessage);
  }): {
    waitForIntercept: () => Promise<LlmResponseSimulator>;
    completeAfterIntercept: () => Promise<LlmResponseSimulator>;
  } {
    const waitForInterceptPromise = Promise.race([
      new Promise<LlmResponseSimulator>((outerResolve) => {
        this.requestInterceptors.push({
          name,
          when,
          handle: (request, response, requestBody) => {
            function write(chunk: string) {
              return new Promise<void>((resolve) => response.write(chunk, () => resolve()));
            }
            function end() {
              return new Promise<void>((resolve) => response.end(resolve));
            }

            const simulator: LlmResponseSimulator = {
              requestBody,
              status: once((status: number) => {
                response.writeHead(status, {
                  'Elastic-Interceptor': name.replace(/[^\x20-\x7E]/g, ' '), // Keeps only alphanumeric characters and spaces
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                });
              }),
              next: (msg) => {
                simulator.status(200);
                const chunk = createOpenAiChunk(msg);
                return write(sseEvent(chunk));
              },
              rawWrite: (chunk: string) => {
                simulator.status(200);
                return write(chunk);
              },
              rawEnd: async () => {
                await end();
              },
              complete: async () => {
                this.log.debug(`Completed intercept for "${name}"`);
                await write('data: [DONE]\n\n');
                await end();
              },
              error: async (error) => {
                await write(`data: ${JSON.stringify({ error })}\n\n`);
                await end();
              },
            };

            outerResolve(simulator);

            return isFunction(responseMock) ? responseMock(simulator.requestBody) : responseMock;
          },
        });
      }),
      new Promise<LlmResponseSimulator>((_, reject) => {
        setTimeout(() => reject(new Error(`Interceptor "${name}" timed out after 30000ms`)), 30000);
      }),
    ]);

    return {
      waitForIntercept: () => waitForInterceptPromise,
      completeAfterIntercept: async () => {
        const simulator = await waitForInterceptPromise;

        function getParsedChunks(): Array<string | ToolMessage> {
          const llmMessage = isFunction(responseMock)
            ? responseMock(simulator.requestBody)
            : responseMock;

          if (!llmMessage) {
            return [];
          }

          if (Array.isArray(llmMessage)) {
            return llmMessage;
          }

          if (isString(llmMessage)) {
            return llmMessage.split(' ').map((token, i) => (i === 0 ? token : ` ${token}`));
          }

          return [llmMessage];
        }

        const parsedChunks = getParsedChunks();
        for (const chunk of parsedChunks) {
          await simulator.next(chunk);
        }

        await simulator.complete();
        return simulator;
      },
    } as any;
  }
}

export async function createLlmProxy(log: ToolingLog) {
  const port = await getPort({ port: getPort.makeRange(9000, 9100) });
  log.debug(`Starting LLM Proxy on port ${port}`);
  return new LlmProxy(port, log);
}

async function getRequestBody(request: http.IncomingMessage): Promise<ChatCompletionStreamParams> {
  return new Promise((resolve, reject) => {
    let data = '';

    request.on('data', (chunk) => {
      data += chunk.toString();
    });

    request.on('close', () => {
      resolve(JSON.parse(data));
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

function sseEvent(chunk: unknown) {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}
