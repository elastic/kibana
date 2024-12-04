/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import OpenAI from 'openai';
import { PassThrough } from 'stream';
import { IncomingMessage } from 'http';
import {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { Stream } from 'openai/streaming';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { removeEndpointFromUrl } from './lib/openai_utils';
import {
  RunActionParamsSchema,
  RunActionResponseSchema,
  DashboardActionParamsSchema,
  StreamActionParamsSchema,
  StreamingResponseSchema,
  InvokeAIActionParamsSchema,
} from '../../../common/openai/schema';
import type {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  StreamActionParams,
} from '../../../common/openai/types';
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_TIMEOUT_MS,
  OpenAiProviderType,
  SUB_ACTION,
} from '../../../common/openai/constants';
import {
  DashboardActionParams,
  DashboardActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
} from '../../../common/openai/types';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import {
  getAxiosOptions,
  getAzureApiVersionParameter,
  getRequestWithStreamOption,
  pipeStreamingResponse,
  sanitizeRequest,
} from './lib/utils';

export class OpenAIConnector extends SubActionConnector<Config, Secrets> {
  private url;
  private provider;
  private key;
  private openAI;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.provider = this.config.apiProvider;
    this.key = this.secrets.apiKey;

    this.openAI =
      this.config.apiProvider === OpenAiProviderType.AzureAi
        ? new OpenAI({
            apiKey: this.secrets.apiKey,
            baseURL: this.config.apiUrl,
            defaultQuery: { 'api-version': getAzureApiVersionParameter(this.config.apiUrl) },
            defaultHeaders: {
              ...this.config.headers,
              'api-key': this.secrets.apiKey,
            },
          })
        : new OpenAI({
            baseURL: removeEndpointFromUrl(this.config.apiUrl),
            apiKey: this.secrets.apiKey,
            defaultHeaders: {
              ...this.config.headers,
            },
          });

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runApi',
      schema: RunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runApi',
      schema: RunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.STREAM,
      method: 'streamApi',
      schema: StreamActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.DASHBOARD,
      method: 'getDashboard',
      schema: DashboardActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.INVOKE_AI,
      method: 'invokeAI',
      schema: InvokeAIActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.INVOKE_STREAM,
      method: 'invokeStream',
      schema: InvokeAIActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.INVOKE_ASYNC_ITERATOR,
      method: 'invokeAsyncIterator',
      schema: InvokeAIActionParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<{ error?: { message?: string } }>): string {
    // handle known Azure error from early release, we can probably get rid of this eventually
    if (error.message === '404 Unrecognized request argument supplied: functions') {
      // add information for known Azure error
      return `API Error: ${error.message}
        \n\nFunction support with Azure OpenAI API was added in 2023-07-01-preview. Update the API version of the Azure OpenAI connector in use
      `;
    }
    if (!error.response?.status) {
      return `Unexpected API Error: ${error.code ?? ''} - ${error.message ?? 'Unknown error'}`;
    }
    if (error.response.status === 401) {
      return `Unauthorized API Error${
        error.response?.data?.error?.message ? ` - ${error.response.data.error?.message}` : ''
      }`;
    }
    return `API Error: ${error.response?.statusText}${
      error.response?.data?.error?.message ? ` - ${error.response.data.error?.message}` : ''
    }`;
  }
  /**
   * responsible for making a POST request to the external API endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   */

  public async runApi(
    { body, signal, timeout }: RunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse> {
    const sanitizedBody = sanitizeRequest(
      this.provider,
      this.url,
      body,
      ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
    );
    const axiosOptions = getAxiosOptions(this.provider, this.key, false);
    const response = await this.request(
      {
        url: this.url,
        method: 'post',
        responseSchema: RunActionResponseSchema,
        data: sanitizedBody,
        signal,
        // give up to 2 minutes for response
        timeout: timeout ?? DEFAULT_TIMEOUT_MS,
        ...axiosOptions,
        headers: {
          ...this.config.headers,
          ...axiosOptions.headers,
        },
      },
      connectorUsageCollector
    );
    return response.data;
  }

  /**
   *  responsible for making a POST request to a specified URL with a given request body.
   *  The method can handle both regular API requests and streaming requests based on the stream parameter.
   *  It uses helper functions getRequestWithStreamOption and getAxiosOptions to prepare the request body and headers respectively.
   *  The response is then processed based on whether it is a streaming response or a regular response.
   * @param body request body for the API request
   * @param stream flag indicating whether it is a streaming request or not
   */
  public async streamApi(
    { body, stream, signal, timeout }: StreamActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse> {
    const executeBody = getRequestWithStreamOption(
      this.provider,
      this.url,
      body,
      stream,
      ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
    );

    const axiosOptions = getAxiosOptions(this.provider, this.key, stream);
    console.log('==> streamApi', signal);
    const response = await this.request(
      {
        url: this.url,
        method: 'post',
        responseSchema: stream ? StreamingResponseSchema : RunActionResponseSchema,
        data: executeBody,
        signal,
        ...axiosOptions,
        headers: {
          ...this.config.headers,
          ...axiosOptions.headers,
        },
        timeout,
      },
      connectorUsageCollector
    );
    return stream ? pipeStreamingResponse(response) : response.data;
  }

  /**
   *  retrieves a dashboard from the Kibana server and checks if the
   *  user has the necessary privileges to access it.
   * @param dashboardId The ID of the dashboard to retrieve.
   */
  public async getDashboard({
    dashboardId,
  }: DashboardActionParams): Promise<DashboardActionResponse> {
    const privilege = (await this.esClient.transport.request({
      path: '/_security/user/_has_privileges',
      method: 'POST',
      body: {
        index: [
          {
            names: ['.kibana-event-log-*'],
            allow_restricted_indices: true,
            privileges: ['read'],
          },
        ],
      },
    })) as { has_all_requested: boolean };

    if (!privilege?.has_all_requested) {
      return { available: false };
    }

    const response = await initDashboard({
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      dashboardId,
      genAIProvider: 'OpenAI',
    });

    return { available: response.success };
  }

  /**
   * Streamed security solution AI Assistant requests (non-langchain)
   * Responsible for invoking the streamApi method with the provided body and
   * stream parameters set to true. It then returns a ReadableStream, meant to be
   * returned directly to the client for streaming
   * @param body - the OpenAI Invoke request body
   */
  public async invokeStream(
    body: InvokeAIActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<PassThrough> {
    const { signal, timeout, ...rest } = body;

    const res = (await this.streamApi(
      {
        body: JSON.stringify(rest),
        stream: true,
        signal,
        timeout, // do not default if not provided
      },
      connectorUsageCollector
    )) as unknown as IncomingMessage;

    return res.pipe(new PassThrough());
  }

  /**
   * Streamed security solution AI Assistant requests (langchain)
   * Uses the official OpenAI Node library, which handles Server-sent events for you.
   * @param body - the OpenAI Invoke request body
   * @returns {
   *  consumerStream: Stream<ChatCompletionChunk>; the result to be read/transformed on the server and sent to the client via Server Sent Events
   *  tokenCountStream: Stream<ChatCompletionChunk>; the result for token counting stream
   * }
   */
  public async invokeAsyncIterator(
    body: InvokeAIActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{
    consumerStream: Stream<ChatCompletionChunk>;
    tokenCountStream: Stream<ChatCompletionChunk>;
  }> {
    try {
      const { signal, timeout, ...rest } = body;
      const messages = rest.messages as unknown as ChatCompletionMessageParam[];
      const requestBody: ChatCompletionCreateParamsStreaming = {
        ...rest,
        stream: true,
        messages,
        model:
          rest.model ??
          ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
      };

      connectorUsageCollector.addRequestBodyBytes(undefined, requestBody);
      console.log('==> invokeAsyncIterator', signal);
      const stream = await this.openAI.chat.completions.create(requestBody, {
        signal,
        timeout, // do not default if not provided
      });
      // splits the stream in two, teed[0] is used for the UI and teed[1] for token tracking
      const teed = stream.tee();
      return { consumerStream: teed[0], tokenCountStream: teed[1] };
      // since we do not use the sub action connector request method, we need to do our own error handling
    } catch (e) {
      console.log('==> invokeAsyncIterator e', e);
      const errorMessage = this.getResponseErrorMessage(e);
      throw new Error(errorMessage);
    }
  }

  /**
   * Non-streamed security solution AI Assistant requests
   * Responsible for invoking the runApi method with the provided body.
   * It then formats the response into a string
   * To use function calling, call the run subaction directly
   * @param body - the OpenAI chat completion request body
   * @returns an object with the response string and the usage object
   */
  public async invokeAI(
    body: InvokeAIActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<InvokeAIActionResponse> {
    const { signal, timeout, ...rest } = body;
    const res = await this.runApi(
      { body: JSON.stringify(rest), signal, timeout },
      connectorUsageCollector
    );

    if (res.choices && res.choices.length > 0 && res.choices[0].message?.content) {
      const result = res.choices[0].message.content.trim();
      return { message: result, usage: res.usage };
    }

    return {
      message:
        'An error occurred sending your message. \n\nAPI Error: The response from OpenAI was in an unrecognized format.',
      ...(res.usage
        ? { usage: res.usage }
        : { usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }),
    };
  }
}
