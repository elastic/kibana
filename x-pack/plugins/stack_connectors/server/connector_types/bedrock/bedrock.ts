/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import aws from 'aws4';
import type { AxiosError } from 'axios';
import { IncomingMessage } from 'http';
import { PassThrough, Transform } from 'stream';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import {
  RunActionParamsSchema,
  RunActionResponseSchema,
  InvokeAIActionParamsSchema,
  StreamingResponseSchema,
} from '../../../common/bedrock/schema';
import type {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
  StreamActionParams,
} from '../../../common/bedrock/types';
import { SUB_ACTION, DEFAULT_TOKEN_LIMIT } from '../../../common/bedrock/constants';
import { StreamingResponse } from '../../../common/bedrock/types';

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

    this.registerSubAction({
      name: SUB_ACTION.INVOKE_STREAM,
      method: 'invokeStream',
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
  private signRequest(body: string, path: string, stream: boolean) {
    const { host } = new URL(this.url);
    return aws.sign(
      {
        host,
        headers: stream
          ? {
              accept: 'application/vnd.amazon.eventstream',
              'Content-Type': 'application/json',
              'x-amzn-bedrock-accept': '*/*',
            }
          : {
              'Content-Type': 'application/json',
              Accept: '*/*',
            },
        body,
        path,
        // Despite AWS docs, this value does not always get inferred. We need to always send it
        service: 'bedrock',
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
    const path = `/model/${reqModel ?? this.model}/invoke`;
    const signed = this.signRequest(body, path, false);
    const response = await this.request({
      ...signed,
      url: `${this.url}${path}`,
      method: 'post',
      responseSchema: RunActionResponseSchema,
      data: body,
      // give up to 2 minutes for response
      timeout: 120000,
    });
    return response.data;
  }

  /**
   *  NOT INTENDED TO BE CALLED DIRECTLY
   *  call invokeStream instead
   *  responsible for making a POST request to a specified URL with a given request body.
   *  The response is then processed based on whether it is a streaming response or a regular response.
   * @param body The stringified request body to be sent in the POST request.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  private async streamApi({
    body,
    model: reqModel,
  }: StreamActionParams): Promise<StreamingResponse> {
    // set model on per request basis
    const path = `/model/${reqModel ?? this.model}/invoke-with-response-stream`;
    const signed = this.signRequest(body, path, true);

    const response = await this.request({
      ...signed,
      url: `${this.url}${path}`,
      method: 'post',
      responseSchema: StreamingResponseSchema,
      data: body,
      responseType: 'stream',
    });

    return response.data.pipe(new PassThrough());
  }

  /**
   *  takes in an array of messages and a model as inputs. It calls the streamApi method to make a
   *  request to the Bedrock API with the formatted messages and model. It then returns a Transform stream
   *  that pipes the response from the API through the transformToString function,
   *  which parses the proprietary response into a string of the response text alone
   * @param messages An array of messages to be sent to the API
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async invokeStream({ messages, model }: InvokeAIActionParams): Promise<Transform> {
    const res = (await this.streamApi({
      body: JSON.stringify(formatBedrockBody({ messages })),
      model,
    })) as unknown as IncomingMessage;
    return res.pipe(transformToString());
  }

  /**
   * Deprecated. Use invokeStream instead.
   * TODO: remove before 8.12 FF in part 3 of streaming work for security solution
   * tracked here: https://github.com/elastic/security-team/issues/7363
   * No token tracking implemented for this method
   */
  public async invokeAI({
    messages,
    model,
  }: InvokeAIActionParams): Promise<InvokeAIActionResponse> {
    const res = await this.runApi({ body: JSON.stringify(formatBedrockBody({ messages })), model });
    return { message: res.completion.trim() };
  }
}

const formatBedrockBody = ({
  messages,
}: {
  messages: Array<{ role: string; content: string }>;
}) => {
  const combinedMessages = messages.reduce((acc: string, message) => {
    const { role, content } = message;
    // Bedrock only has Assistant and Human, so 'system' and 'user' will be converted to Human
    const bedrockRole = role === 'assistant' ? '\n\nAssistant:' : '\n\nHuman:';
    return `${acc}${bedrockRole}${content}`;
  }, '');

  return {
    // end prompt in "Assistant:" to avoid the model starting its message with "Assistant:"
    prompt: `${combinedMessages} \n\nAssistant:`,
    max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
    temperature: 0.5,
    // prevent model from talking to itself
    stop_sequences: ['\n\nHuman:'],
  };
};

/**
 * Takes in a readable stream of data and returns a Transform stream that
 * uses the AWS proprietary codec to parse the proprietary bedrock response into
 * a string of the response text alone, returning the response string to the stream
 */
const transformToString = () =>
  new Transform({
    transform(chunk, encoding, callback) {
      const encoder = new TextEncoder();
      const decoder = new EventStreamCodec(toUtf8, fromUtf8);
      const event = decoder.decode(chunk);
      const body = JSON.parse(
        Buffer.from(
          JSON.parse(new TextDecoder('utf-8').decode(event.body)).bytes,
          'base64'
        ).toString()
      );
      const newChunk = encoder.encode(body.completion);
      callback(null, newChunk);
    },
  });
