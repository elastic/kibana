/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import aws from 'aws4';
import type { AxiosError } from 'axios';
import {
  RunActionParamsSchema,
  RunActionResponseSchema,
  InvokeAIActionParamsSchema,
} from '../../../common/bedrock/schema';
import type {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
} from '../../../common/bedrock/types';
import { SUB_ACTION, DEFAULT_TOKEN_LIMIT } from '../../../common/bedrock/constants';

interface SignedRequest {
  host: string;
  headers: Record<string, string>;
  body: string;
  path: string;
}

export class BedrockConnector extends SubActionConnector<Config, Secrets> {
  private url;
  private model;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.model = this.config.defaultModel;

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
      name: SUB_ACTION.INVOKE_AI,
      method: 'invokeAI',
      schema: InvokeAIActionParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<{ message?: string }>): string {
    if (!error.response?.status) {
      return `Unexpected API Error: ${error.code ?? ''} - ${error.message ?? 'Unknown error'}`;
    }
    if (error.response.status === 401) {
      return `Unauthorized API Error${
        error.response?.data?.message ? ` - ${error.response.data.message}` : ''
      }`;
    }
    return `API Error: ${error.response?.statusText}${
      error.response?.data?.message ? ` - ${error.response.data.message}` : ''
    }`;
  }

  /**
   * provides the AWS signature to the external API endpoint
   * @param body The request body to be signed.
   * @param path The path of the request URL.
   */
  private signRequest(body: string, path: string) {
    const { host } = new URL(this.url);
    return aws.sign(
      {
        host,
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body,
        path,
      },
      {
        secretAccessKey: this.secrets.secret,
        accessKeyId: this.secrets.accessKey,
      }
    ) as SignedRequest;
  }

  /**
   * responsible for making a POST request to the external API endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async runApi({ body, model: reqModel }: RunActionParams): Promise<RunActionResponse> {
    // set model on per request basis
    const model = reqModel ? reqModel : this.model;
    const signed = this.signRequest(body, `/model/${model}/invoke`);
    const response = await this.request({
      ...signed,
      url: `${this.url}/model/${model}/invoke`,
      method: 'post',
      responseSchema: RunActionResponseSchema,
      data: body,
      // give up to 2 minutes for response
      timeout: 120000,
    });
    return response.data;
  }

  /**
   * takes in an array of messages and a model as input, and returns a promise that resolves to a string.
   * The method combines the messages into a single prompt formatted for bedrock,sends a request to the
   * runApi method with the prompt and model, and returns the trimmed completion from the response.
   * @param messages An array of message objects, where each object has a role (string) and content (string) property.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async invokeAI({
    messages,
    model,
  }: InvokeAIActionParams): Promise<InvokeAIActionResponse> {
    const combinedMessages = messages.reduce((acc: string, message) => {
      const { role, content } = message;
      // Bedrock only has Assistant and Human, so 'system' and 'user' will be converted to Human
      const bedrockRole = role === 'assistant' ? '\n\nAssistant:' : '\n\nHuman:';
      return `${acc}${bedrockRole}${content}`;
    }, '');

    const req = {
      // end prompt in "Assistant:" to avoid the model starting its message with "Assistant:"
      prompt: `${combinedMessages} \n\nAssistant:`,
      max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
      temperature: 0.5,
      // prevent model from talking to itself
      stop_sequences: ['\n\nHuman:'],
    };

    const res = await this.runApi({ body: JSON.stringify(req), model });
    return res.completion.trim();
  }
}
