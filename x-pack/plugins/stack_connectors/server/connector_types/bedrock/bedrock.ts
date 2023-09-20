/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import {
  BedrockRunActionParamsSchema,
  BedrockRunActionResponseSchema,
  InvokeAIActionParamsSchema,
} from '../../../common/bedrock/schema';
import type {
  BedrockConfig,
  BedrockSecrets,
  BedrockRunActionParams,
  BedrockRunActionResponse,
} from '../../../common/bedrock/types';
import { DEFAULT_BEDROCK_REGION, SUB_ACTION } from '../../../common/bedrock/constants';
import { InvokeAIActionParams, InvokeAIActionResponse } from '../../../common/bedrock/types';

export class BedrockConnector extends SubActionConnector<BedrockConfig, BedrockSecrets> {
  private url;
  private model;
  private interceptor;

  constructor(params: ServiceParams<BedrockConfig, BedrockSecrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.model = this.config.defaultModel;

    this.interceptor = aws4Interceptor({
      options: {
        region: DEFAULT_BEDROCK_REGION,
        service: 'bedrock',
      },
      credentials: {
        accessKeyId: this.secrets.accessKey,
        secretAccessKey: this.secrets.secret,
      },
    });

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runApi',
      schema: BedrockRunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runApi',
      schema: BedrockRunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.INVOKE_AI,
      method: 'invokeAI',
      schema: InvokeAIActionParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<{ error?: { message?: string } }>): string {
    if (!error.response?.status) {
      return `Unexpected API Error: ${error.code} - ${error.message}`;
    }
    if (error.response.status === 401) {
      return 'Unauthorized API Error';
    }
    return `API Error: ${error.response?.status} - ${error.response?.statusText}${
      error.response?.data?.error?.message ? ` - ${error.response.data.error?.message}` : ''
    }`;
  }

  public async runApi({ body }: BedrockRunActionParams): Promise<BedrockRunActionResponse> {
    const response = await this.request({
      url: `${this.url}/model/${this.model}/invoke`,
      method: 'post',
      responseSchema: BedrockRunActionResponseSchema,
      data: body,
      headers: {
        accept: '*/*',
      },
      interceptor: this.interceptor,
    });
    return response.data;
  }

  public async invokeAI({ messages }: InvokeAIActionParams): Promise<InvokeAIActionResponse> {
    const combinedMessages = messages.reduce((acc: string, message) => {
      const { role, content } = message;
      // Bedrock only has Assistant and Human, so 'system' and 'user' will be converted to Human
      const bedrockRole = role === 'assistant' ? '\n\nAssistant:' : '\n\nHuman:';
      return `${acc}${bedrockRole}${content}`;
    }, '');

    const req = {
      // end prompt in "Assistant:" to avoid the model starting its message with "Assistant:"
      prompt: `${combinedMessages} \n\nAssistant:`,
      max_tokens_to_sample: 300,
      // prevent model from talking to itself
      stop_sequences: ['\n\nHuman:'],
    };

    const res = await this.runApi({ body: JSON.stringify(req) });
    return res.completion.trim();
  }
}
