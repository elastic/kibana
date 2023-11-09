/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import { PassThrough, Transform } from 'stream';
import { IncomingMessage } from 'http';
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
import { SUB_ACTION } from '../../../common/openai/constants';
import {
  DashboardActionParams,
  DashboardActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
} from '../../../common/openai/types';
import { initDashboard } from './create_dashboard';
import {
  getAxiosOptions,
  getRequestWithStreamOption,
  pipeStreamingResponse,
  sanitizeRequest,
} from './lib/utils';

export class OpenAIConnector extends SubActionConnector<Config, Secrets> {
  private url;
  private provider;
  private key;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.provider = this.config.apiProvider;
    this.key = this.secrets.apiKey;

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
  }

  protected getResponseErrorMessage(error: AxiosError<{ error?: { message?: string } }>): string {
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
  public async runApi({ body }: RunActionParams): Promise<RunActionResponse> {
    const sanitizedBody = sanitizeRequest(
      this.provider,
      this.url,
      body,
      ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
    );
    const axiosOptions = getAxiosOptions(this.provider, this.key, false);
    const response = await this.request({
      url: this.url,
      method: 'post',
      responseSchema: RunActionResponseSchema,
      data: sanitizedBody,
      // give up to 2 minutes for response
      timeout: 120000,
      ...axiosOptions,
    });
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
  public async streamApi({ body, stream }: StreamActionParams): Promise<RunActionResponse> {
    const executeBody = getRequestWithStreamOption(
      this.provider,
      this.url,
      body,
      stream,
      ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
    );

    const axiosOptions = getAxiosOptions(this.provider, this.key, stream);
    const response = await this.request({
      url: this.url,
      method: 'post',
      responseSchema: stream ? StreamingResponseSchema : RunActionResponseSchema,
      data: executeBody,
      ...axiosOptions,
    });
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
    });

    return { available: response.success };
  }

  public async invokeStream(body: InvokeAIActionParams): Promise<Transform> {
    const res = (await this.streamApi({
      body: JSON.stringify(body),
      stream: true,
    })) as unknown as IncomingMessage;
    return res.compose(new PassThrough()).compose(transformToString());
  }

  /**
   * Deprecated. Use invokeStream instead.
   * TODO: remove before 8.12 FF
   */
  public async invokeAI(body: InvokeAIActionParams): Promise<InvokeAIActionResponse> {
    const res = await this.runApi({ body: JSON.stringify(body) });

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
const transformToString = () =>
  new Transform({
    transform(chunk, encoding, callback) {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      const nextChunk = decoder
        .decode(chunk)
        .split('\n')
        // every line starts with "data: ", we remove it and are left with stringified JSON or the string "[DONE]"
        .map((str) => str.substring(6))
        // filter out empty lines and the "[DONE]" string
        .filter((str) => !!str && str !== '[DONE]')
        .map((line) => {
          const openaiResponse = JSON.parse(line);
          return openaiResponse.choices[0]?.delta.content ?? '';
        })
        .join('');
      const newChunk = encoder.encode(nextChunk);
      callback(null, newChunk);
    },
  });
