/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import getPort from 'get-port';
import http, { type Server } from 'http';
import { isString, pull, isFunction } from 'lodash';
import pRetry from 'p-retry';
import type { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { createInterceptors } from './interceptors';
import { LlmSimulator } from './llm_simulator';
import type { HttpRequest, HttpResponse, LLMMessage, ToolMessage } from './types';

type RequestHandler = (
  request: HttpRequest,
  response: HttpResponse,
  requestBody: ChatCompletionStreamParams
) => LLMMessage;

interface RequestInterceptor {
  name: string;
  when: (body: ChatCompletionStreamParams) => boolean;
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

        const availableToolNames = requestBody.tools?.map(({ function: fn }) => fn.name);

        this.log.info(`Outgoing conversation "${JSON.stringify(compressedConversation, null, 2)}"`);
        this.log.info(`Tools: ${JSON.stringify(availableToolNames, null, 2)}`);
        if (requestBody.tool_choice) {
          this.log.info(`Tool choice: ${JSON.stringify(requestBody.tool_choice, undefined, 2)}`);
        }

        if (matchingInterceptor) {
          const mockedLlmResponse = matchingInterceptor.handle(request, response, requestBody);
          this.log.info(`Mocked LLM response: ${JSON.stringify(mockedLlmResponse, null, 2)}`);
          pull(this.requestInterceptors, matchingInterceptor);
          return;
        }

        const errorMessage = `No interceptors found to handle request`;
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

        const simulator = new LlmSimulator(requestBody, response, this.log, 'No interceptor found');
        await simulator.writeErrorChunk(404, {
          errorMessage,
          availableInterceptors: this.requestInterceptors.map(({ name }) => name),
        });
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

        const interceptorNames = this.requestInterceptors.map(({ name }) => name);
        this.log.debug(
          `Waiting for the following interceptors to be called: ${JSON.stringify(interceptorNames)}`
        );

        throw new Error(
          `Interceptors were not called: ${interceptorNames.map((name) => `\n - ${name}`)}\n`
        );
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
    waitForIntercept: () => Promise<LlmSimulator>;
    completeAfterIntercept: () => Promise<LlmSimulator>;
  } {
    const getMockedLlmMessage = (body: ChatCompletionStreamParams): LLMMessage | undefined => {
      if (isFunction(responseMock)) {
        return responseMock(body);
      }

      return responseMock;
    };

    const waitForInterceptPromise = withTimeout(
      new Promise<LlmSimulator>((outerResolve) => {
        this.requestInterceptors.push({
          name,
          when,
          handle: (request, response, requestBody) => {
            const simulator = new LlmSimulator(requestBody, response, this.log, name);
            const llmMessage = getMockedLlmMessage(requestBody);
            outerResolve(simulator);

            return llmMessage;
          },
        });
      }),
      30000,
      `Interceptor "${name}" timed out after 30000ms`
    );

    return {
      waitForIntercept: () => waitForInterceptPromise,
      completeAfterIntercept: async () => {
        const simulator = await waitForInterceptPromise;

        function getParsedChunks(): Array<string | ToolMessage> {
          const llmMessage = getMockedLlmMessage(simulator.requestBody);
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
          await simulator.writeChunk(chunk);
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

    request.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(`Failed to parse request body: ${error}`);
      }
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

function withTimeout<T>(promise: Promise<T>, timeout: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeout);
    }),
  ]);
}
