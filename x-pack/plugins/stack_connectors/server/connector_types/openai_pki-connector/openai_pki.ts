/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 * 
 * By: Antonio Piazza @antman1p
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import OpenAI from 'openai';
import { PassThrough } from 'stream';
import fs from 'fs';
import https from 'https';
import {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { Stream } from 'openai/streaming';
import { removeEndpointFromUrl } from './lib/openai_utils';
import {
  RunActionParamsSchema,
  RunActionResponseSchema,
  DashboardActionParamsSchema,
  StreamActionParamsSchema,
  StreamingResponseSchema,
  InvokeAIActionParamsSchema,
} from '../../../common/openai_pki/schema';
import type {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  StreamActionParams,
  DashboardActionParams,
  DashboardActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
} from '../../../common/openai_pki/types';
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_TIMEOUT_MS,
  SUB_ACTION,
} from '../../../common/openai/constants';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';

export class OpenAIPkiConnector extends SubActionConnector<Config, Secrets> {
  private url;
  private key;
  private certPath;
  private keyPath;
  private openAI;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.key = this.secrets.apiKey;
    this.certPath = this.config.certPath;
    this.keyPath = this.config.keyPath;

    // Create HTTPS agent with certificates if provided
    let httpsAgent;
    if (this.certPath && this.keyPath) {
      try {
        httpsAgent = new https.Agent({
          cert: fs.readFileSync(this.certPath),
          key: fs.readFileSync(this.keyPath),
          rejectUnauthorized: false, // Allow self-signed certificates
        });
      } catch (error) {
        throw new Error(`Failed to load PKI certificates: ${error.message}`);
      }
    }

    // Initialize OpenAI SDK with the custom HTTPS agent for PKI
    this.openAI = new OpenAI({
      apiKey: this.secrets.apiKey,
      baseURL: removeEndpointFromUrl(this.config.apiUrl),
      defaultHeaders: {
        ...this.config.headers,
        'Authorization': `Bearer ${this.secrets.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      httpAgent: httpsAgent, // Use our certificate-enabled agent
    });

    this.registerSubActions();
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
  public async runApi({ body, signal, timeout }: RunActionParams): Promise<RunActionResponse> {
    try {
      const sanitizedBody = JSON.parse(body);
      const response = await this.openAI.chat.completions.create({
        ...sanitizedBody,
        model: sanitizedBody.model ?? ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
      }, {
        signal,
        timeout: timeout ?? DEFAULT_TIMEOUT_MS,
      });
      return response;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused. Please check if the API endpoint ${this.url} is accessible and the PKI certificates are valid.`);
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Connection timed out. Please check if the API endpoint ${this.url} is accessible and the PKI certificates are valid.`);
      }
      if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        throw new Error(`Certificate error: ${error.message}. Please check if your PKI certificates are valid and not expired.`);
      }
      throw error;
    }
  }

  /**
   *  responsible for making a POST request to a specified URL with a given request body.
   *  The method can handle both regular API requests and streaming requests based on the stream parameter.
   */
  public async streamApi({
    body,
    stream,
    signal,
    timeout,
  }: StreamActionParams): Promise<RunActionResponse> {
    const sanitizedBody = JSON.parse(body);
    if (stream) {
      const response = await this.openAI.chat.completions.create({
        ...sanitizedBody,
        model: sanitizedBody.model ?? ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
        stream: true,
      }, {
        signal,
        timeout: timeout ?? DEFAULT_TIMEOUT_MS,
      });
      return response;
    }
    return this.runApi({ body, signal, timeout });
  }

  /**
   * Streamed security solution AI Assistant requests
   */
  public async invokeStream(body: InvokeAIActionParams): Promise<PassThrough> {
    const { signal, timeout, ...rest } = body;
    const stream = await this.openAI.chat.completions.create({
      ...rest,
      model: rest.model ?? ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
      stream: true,
    }, {
      signal,
      timeout,
    });

    const passThrough = new PassThrough();
    (async () => {
      try {
        for await (const part of stream) {
          const chunk = part.choices[0]?.delta?.content || '';
          passThrough.write(chunk);
        }
        passThrough.end();
      } catch (error) {
        passThrough.destroy(new Error(this.getResponseErrorMessage(error)));
      }
    })();

    return passThrough;
  }

  /**
   * Non-streamed security solution AI Assistant requests
   */
  public async invokeAI(body: InvokeAIActionParams): Promise<InvokeAIActionResponse> {
    const { signal, timeout, ...rest } = body;
    const response = await this.openAI.chat.completions.create({
      ...rest,
      model: rest.model ?? ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
    }, {
      signal,
      timeout: timeout ?? DEFAULT_TIMEOUT_MS,
    });

    if (response.choices && response.choices.length > 0 && response.choices[0].message?.content) {
      const result = response.choices[0].message.content.trim();
      return { message: result, usage: response.usage };
    }

    return {
      message:
        'An error occurred sending your message. \n\nAPI Error: The response from OpenAI was in an unrecognized format.',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
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
}
