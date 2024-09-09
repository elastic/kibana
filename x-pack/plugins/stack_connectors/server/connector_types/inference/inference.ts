/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { AxiosError, Method } from 'axios';
import { PassThrough } from 'stream';
import { IncomingMessage } from 'http';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ConnectorTokenClientContract } from '@kbn/actions-plugin/server/types';

import {
  ChatCompleteParamsSchema,
  ChatCompleteResponseSchema,
  RerankParamsSchema,
  SparseEmbeddingParamsSchema,
  StreamingResponseSchema,
  TextEmbeddingParamsSchema,
} from '../../../common/inference/schema';
import {
  Config,
  Secrets,
  ChatCompleteParams,
  ChatCompleteResponse,
  StreamingResponse,
} from '../../../common/inference/types';
import { SUB_ACTION } from '../../../common/inference/constants';

interface MessagePart {
  text: string;
}

interface MessageContent {
  role: string;
  parts: MessagePart[];
}

interface Payload {
  contents: MessageContent[];
  generation_config: {
    temperature: number;
    maxOutputTokens: number;
  };
}

export class InferenceConnector extends SubActionConnector<Config, Secrets> {
  private provider;
  private inferenceId;
  private taskType;
  private providerSchema;
  private connectorTokenClient: ConnectorTokenClientContract;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.provider = this.config.provider;
    this.taskType = this.config.taskType;
    this.inferenceId = this.config.inferenceId;
    this.providerSchema = this.config.providerSchema;
    this.logger = this.logger;
    this.connectorID = this.connector.id;
    this.connectorTokenClient = params.services.connectorTokenClient;

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.CHAT_COMPLETE,
      method: 'runApi',
      schema: ChatCompleteParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.RERANK,
      method: 'runApi',
      schema: RerankParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.SPARSE_EMBEDDING,
      method: 'runApi',
      schema: SparseEmbeddingParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEXT_EMBEDDING,
      method: 'runApi',
      schema: TextEmbeddingParamsSchema,
    });

    /* this.registerSubAction({
      name: SUB_ACTION.INVOKE_STREAM,
      method: 'invokeStream',
      schema: InvokeAIActionParamsSchema,
    }); */
  }

  protected getResponseErrorMessage(error: AxiosError<{ message?: string }>): string {
    if (!error.response?.status) {
      return `Unexpected API Error: ${error.code ?? ''} - ${error.message ?? 'Unknown error'}`;
    }
    if (
      error.response.status === 400 &&
      error.response?.data?.message === 'The requested operation is not recognized by the service.'
    ) {
      return `API Error: ${error.response.data.message}`;
    }
    if (error.response.status === 401) {
      return `Unauthorized API Error${
        error.response?.data?.message ? `: ${error.response.data.message}` : ''
      }`;
    }
    return `API Error: ${error.response?.statusText}${
      error.response?.data?.message ? ` - ${error.response.data.message}` : ''
    }`;
  }

  /**
   * responsible for making a POST request to the Inference API chat completetion task endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async runApi({ input }: ChatCompleteParams): Promise<ChatCompleteResponse> {
    // set model on per request basis
    const currentModel = this.model;
    const path = `/v1/projects/${this.gcpProjectID}/locations/${this.gcpRegion}/publishers/google/models/${currentModel}:generateContent`;
    const token = '';

    const requestArgs = {
      url: `${this.url}${path}`,
      method: 'post' as Method,
      data: { input },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // signal,
      // timeout,
      responseSchema: ChatCompleteResponseSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as SubActionRequestParams<any>;

    const response = await this.request(requestArgs);
    const candidate = response?.data?.candidates;
    const usageMetadata = response?.data?.usageMetadata;
    const completionText = candidate.content.parts[0].text;

    return { completion: completionText };
  }

  private async streamAPI({ input }: ChatCompleteParams): Promise<StreamingResponse> {
    const currentModel = this.model;
    const path = `/v1/projects/${this.gcpProjectID}/locations/${this.gcpRegion}/publishers/google/models/${currentModel}:streamGenerateContent?alt=sse`;
    const token = '';

    const response = await this.request({
      url: `${this.url}${path}`,
      method: 'post',
      responseSchema: StreamingResponseSchema,
      data: { input },
      responseType: 'stream',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // signal,
      // timeout,
    });

    return response.data.pipe(new PassThrough());
  }

  /**
   *  takes in an array of messages and a model as inputs. It calls the streamApi method to make a
   *  request to the Inference API with the formatted messages and model. It then returns a Transform stream
   *  that pipes the response from the API through the transformToString function,
   *  which parses the proprietary response into a string of the response text alone
   * @param messages An array of messages to be sent to the API
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async invokeStream({ input }: ChatCompleteParams): Promise<IncomingMessage> {
    const res = (await this.streamAPI({
      input: JSON.stringify(formatInferencePayload([{ role: 'user', content: input }], 0)),
    })) as unknown as IncomingMessage;
    return res;
  }
}

/** Format the json body to meet Inference API payload requirements */
const formatInferencePayload = (
  data: Array<{ role: string; content: string }>,
  temperature: number
): Payload => {
  const payload: Payload = {
    contents: [],
    generation_config: {
      temperature,
      maxOutputTokens: 10000,
    },
  };
  let previousRole: string | null = null;

  for (const row of data) {
    const correctRole = row.role === 'assistant' ? 'model' : 'user';
    if (correctRole === 'user' && previousRole === 'user') {
      /** Append to the previous 'user' content
       * This is to ensure that multiturn requests alternate between user and model
       */
      payload.contents[payload.contents.length - 1].parts[0].text += ` ${row.content}`;
    } else {
      // Add a new entry
      payload.contents.push({
        role: correctRole,
        parts: [
          {
            text: row.content,
          },
        ],
      });
    }
    previousRole = correctRole;
  }
  return payload;
};
