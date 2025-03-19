/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 *
 * PKI functionality added by Antonio Piazza @antman1p
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
import { removeEndpointFromUrl, validatePKICertificates } from './lib/openai_utils';
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
import fs from 'fs';
import https from 'https';

export class OpenAIConnector extends SubActionConnector<Config, Secrets> {
  private url: string;
  private provider: OpenAiProviderType;
  private key: string;
  private openAI: OpenAI;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.provider = this.config.apiProvider;
    this.key = this.secrets.apiKey;

    try {
      if (this.provider === OpenAiProviderType.PkiOpenAi) {
        if (!this.config.certPath || !this.config.keyPath) {
          throw new Error('Certificate and key paths are required for PKI authentication');
        }

        if (!validatePKICertificates(this.config.certPath, this.config.keyPath)) {
          throw new Error('Invalid or inaccessible PKI certificates');
        }

        const httpsAgent = new https.Agent({
          cert: fs.readFileSync(this.config.certPath),
          key: fs.readFileSync(this.config.keyPath),
          rejectUnauthorized: this.config.verificationMode === 'none', // 'none' skips all validation
          checkServerIdentity:
            this.config.verificationMode === 'certificate' || this.config.verificationMode === 'none'
              ? () => undefined // Skip hostname check for 'certificate' and 'none'
              : undefined, // Use default hostname verification for 'full'
        });

        this.openAI = new OpenAI({
          apiKey: this.key,
          baseURL: removeEndpointFromUrl(this.url),
          defaultHeaders: this.config.headers,
          httpAgent: httpsAgent,
        });
      } else {
        this.openAI = new OpenAI({
          apiKey: this.key,
          baseURL: removeEndpointFromUrl(this.url),
          defaultHeaders: this.config.headers,
        });
      }
    } catch (error) {
      this.logger.error(`Error initializing OpenAI client: ${error.message}`);
      throw error;
    }

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
    if (error.message === '404 Unrecognized request argument supplied: functions') {
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

  public async runApi({ body, signal, timeout }: RunActionParams): Promise<RunActionResponse> {
    if (this.provider === OpenAiProviderType.PkiOpenAi) {
      try {
        const sanitizedBody = JSON.parse(body);
        const response = await this.openAI.chat.completions.create(
          {
            ...sanitizedBody,
            model:
              sanitizedBody.model ??
              ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
          },
          {
            signal,
            timeout: timeout ?? DEFAULT_TIMEOUT_MS,
          }
        );
        this.logger.debug(`PKI OpenAI Response (runApi): ${JSON.stringify(response)}`);
        return response as RunActionResponse;
      } catch (error) {
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          throw new Error(
            `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`
          );
        }
        throw error;
      }
    } else {
      const sanitizedBody = sanitizeRequest(
        this.provider,
        this.url,
        body,
        ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
      );
      const axiosOptions = getAxiosOptions(this.provider, this.key, false, this.config);
      const response = await this.request({
        url: this.url,
        method: 'post',
        responseSchema: RunActionResponseSchema,
        data: sanitizedBody,
        signal,
        timeout: timeout ?? DEFAULT_TIMEOUT_MS,
        ...axiosOptions,
        headers: {
          ...this.config.headers,
          ...axiosOptions.headers,
        },
      });
      return response.data;
    }
  }

  public async streamApi({
    body,
    stream,
    signal,
    timeout,
  }: StreamActionParams): Promise<RunActionResponse> {
    if (this.provider === OpenAiProviderType.PkiOpenAi) {
      const sanitizedBody = JSON.parse(body);
      if (stream) {
        const response = await this.openAI.chat.completions.create(
          {
            ...sanitizedBody,
            model:
              sanitizedBody.model ??
              ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
            stream: true,
          },
          {
            signal,
            timeout: timeout ?? DEFAULT_TIMEOUT_MS,
          }
        );
        this.logger.debug(`PKI OpenAI Streaming Response (streamApi): ${JSON.stringify(response)}`);
        return response as RunActionResponse;
      }
      return this.runApi({ body, signal, timeout });
    } else {
      const executeBody = getRequestWithStreamOption(
        this.provider,
        this.url,
        body,
        stream,
        ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
      );
      const axiosOptions = getAxiosOptions(this.provider, this.key, stream, this.config);
      const response = await this.request({
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
      });
      return stream ? pipeStreamingResponse(response) : response.data;
    }
  }

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

  public async invokeStream(body: InvokeAIActionParams): Promise<PassThrough> {
    const { signal, timeout, ...rest } = body;
    const res = (await this.streamApi({
      body: JSON.stringify(rest),
      stream: true,
      signal,
      timeout,
    })) as unknown as IncomingMessage;
    return res.pipe(new PassThrough());
  }

  public async invokeAsyncIterator(body: InvokeAIActionParams): Promise<{
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
      const stream = await this.openAI.chat.completions.create(requestBody, {
        signal,
        timeout,
      });
      const teed = stream.tee();
      return { consumerStream: teed[0], tokenCountStream: teed[1] };
    } catch (e) {
      const errorMessage = this.getResponseErrorMessage(e);
      throw new Error(errorMessage);
    }
  }

  public async invokeAI(body: InvokeAIActionParams): Promise<InvokeAIActionResponse> {
    const { signal, timeout, ...rest } = body;
    const res = await this.runApi({ body: JSON.stringify(rest), signal, timeout });

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
