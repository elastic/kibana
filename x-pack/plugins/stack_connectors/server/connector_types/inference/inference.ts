/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/core/server';

import { PassThrough, Stream } from 'stream';
import { IncomingMessage } from 'http';

import { RequestBody } from '@elastic/elasticsearch';
import { AxiosError } from 'axios';
import { i18n } from '@kbn/i18n';
import {
  ChatCompleteParamsSchema,
  RerankParamsSchema,
  SparseEmbeddingParamsSchema,
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
  // Not using Axios
  protected getResponseErrorMessage(error: AxiosError): string {
    throw new Error('Method not implemented.');
  }

  private provider;
  private inferenceId;
  private taskType;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.provider = this.config.provider;
    this.taskType = this.config.taskType;
    this.inferenceId = this.config.inferenceId;
    this.logger = this.logger;
    this.connectorID = this.connector.id;
    this.connectorTokenClient = params.services.connectorTokenClient;

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.COMPLETION,
      method: 'performApiCompletion',
      schema: ChatCompleteParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.RERANK,
      method: 'performApiRerank',
      schema: RerankParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.SPARSE_EMBEDDING,
      method: 'performApiSparseEmbedding',
      schema: SparseEmbeddingParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEXT_EMBEDDING,
      method: 'performApiTextEmbedding',
      schema: TextEmbeddingParamsSchema,
    });

    /* this.registerSubAction({
      name: SUB_ACTION.INVOKE_STREAM,
      method: 'invokeStream',
      schema: InvokeAIActionParamsSchema,
    }); */
  }

  /**
   * responsible for making a POST request to the Inference API chat completetion task endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   */
  public async performApiCompletion({ input }: ChatCompleteParams): Promise<ChatCompleteResponse> {
    const response = await this.esClient?.transport.request({
      path: `/_inference/${this.taskType}/${this.inferenceId}`,
      method: 'POST',
      body: { input },
    });
    this.logger.info(
      `Perform Inference endpoint for task type "${this.taskType}" and inference id ${this.inferenceId}`
    );

    // const usageMetadata = response?.data?.usageMetadata;
    return response as ChatCompleteResponse;
  }

  /**
   * responsible for making a POST request to the Inference API chat completetion task endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   */
  private async performInferenceApi(body: RequestBody, isStream?: boolean): Promise<unknown> {
    try {
      const response = await this.esClient?.transport.request({
        path: `/_inference/${this.taskType}/${this.config?.inferenceId}`,
        method: 'POST',
        body,
      });
      this.logger.info(
        `Perform Inference endpoint for task type "${this.taskType}" and inference id ${this.config?.inferenceId}`
      );
      // const usageMetadata = response?.data?.usageMetadata;
      return response;
    } catch (err) {
      return wrapErr(err.message, this.connector.id, this.logger);
    }
  }

  private async streamAPI({ input }: ChatCompleteParams): Promise<StreamingResponse> {
    const response = await this.performInferenceApi({ input }, true);

    return (response as Stream).pipe(new PassThrough());
  }

  /**
   *  takes in an array of messages and a model as inputs. It calls the streamApi method to make a
   *  request to the Inference API with the formatted messages and model. It then returns a Transform stream
   *  that pipes the response from the API through the transformToString function,
   *  which parses the proprietary response into a string of the response text alone
   * @param input A message to be sent to the API
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

const wrapErr = (errMessage: string, connectorId: string, logger: Logger) => {
  const message = i18n.translate(
    'xpack.stackConnectors.inference.errorPerformInferenceErrorMessage',
    {
      defaultMessage: 'error perform inference endpoint API',
    }
  );
  logger.error(`error perform inference endpoint API: ${errMessage}`);
  return {
    status: 'error',
    connectorId,
    message,
    serviceMessage: errMessage,
  };
};
