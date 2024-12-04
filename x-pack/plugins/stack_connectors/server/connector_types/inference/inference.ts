/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';

import { PassThrough, Stream } from 'stream';
import { IncomingMessage } from 'http';

import { AxiosError } from 'axios';
import {
  InferenceInferenceRequest,
  InferenceInferenceResponse,
  InferenceTaskType,
} from '@elastic/elasticsearch/lib/api/types';
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
  RerankParams,
  RerankResponse,
  SparseEmbeddingParams,
  SparseEmbeddingResponse,
  TextEmbeddingParams,
  TextEmbeddingResponse,
} from '../../../common/inference/types';
import { SUB_ACTION } from '../../../common/inference/constants';

export class InferenceConnector extends SubActionConnector<Config, Secrets> {
  // Not using Axios
  protected getResponseErrorMessage(error: AxiosError): string {
    throw new Error('Method not implemented.');
  }

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

    this.registerSubAction({
      name: SUB_ACTION.COMPLETION_STREAM,
      method: 'performApiCompletionStream',
      schema: ChatCompleteParamsSchema,
    });
  }

  /**
   * responsible for making a esClient inference method to perform chat completetion task endpoint and returning the service response data
   * @param input the text on which you want to perform the inference task.
   * @signal abort signal
   */
  public async performApiCompletion({
    input,
    signal,
  }: ChatCompleteParams & { signal?: AbortSignal }): Promise<ChatCompleteResponse> {
    const response = await this.performInferenceApi(
      { inference_id: this.inferenceId, input, task_type: 'completion' },
      false,
      signal
    );
    console.log('==> response', response);
    return response.completion!;
  }

  /**
   * responsible for making a esClient inference method to rerank task endpoint and returning the response data
   * @param input the text on which you want to perform the inference task. input can be a single string or an array.
   * @query the search query text
   * @signal abort signal
   */
  public async performApiRerank({
    input,
    query,
    signal,
  }: RerankParams & { signal?: AbortSignal }): Promise<RerankResponse> {
    const response = await this.performInferenceApi(
      {
        query,
        inference_id: this.inferenceId,
        input,
        task_type: 'rerank',
      },
      false,
      signal
    );
    return response.rerank!;
  }

  /**
   * responsible for making a esClient inference method sparse embedding task endpoint and returning the response data
   * @param input the text on which you want to perform the inference task.
   * @signal abort signal
   */
  public async performApiSparseEmbedding({
    input,
    signal,
  }: SparseEmbeddingParams & { signal?: AbortSignal }): Promise<SparseEmbeddingResponse> {
    const response = await this.performInferenceApi(
      { inference_id: this.inferenceId, input, task_type: 'sparse_embedding' },
      false,
      signal
    );
    return response.sparse_embedding!;
  }

  /**
   * responsible for making a esClient inference method text embedding task endpoint and returning the response data
   * @param input the text on which you want to perform the inference task.
   * @signal abort signal
   */
  public async performApiTextEmbedding({
    input,
    inputType,
    signal,
  }: TextEmbeddingParams & { signal?: AbortSignal }): Promise<TextEmbeddingResponse> {
    const response = await this.performInferenceApi(
      {
        inference_id: this.inferenceId,
        input,
        task_type: 'text_embedding',
        task_settings: {
          input_type: inputType,
        },
      },
      false,
      signal
    );
    return response.text_embedding!;
  }

  /**
   * private generic method to avoid duplication esClient inference inference execute.
   * @param params InferenceInferenceRequest params.
   * @param asStream defines the type of the responce, regular or stream
   * @signal abort signal
   */
  private async performInferenceApi(
    params: InferenceInferenceRequest,
    asStream: boolean = false,
    signal?: AbortSignal
  ): Promise<InferenceInferenceResponse> {
    try {
      const response = await this.esClient?.inference.inference(params, { asStream, signal });
      this.logger.info(
        `Perform Inference endpoint for task type "${this.taskType}" and inference id ${this.inferenceId}`
      );
      // TODO: const usageMetadata = response?.data?.usageMetadata;
      return response;
    } catch (err) {
      this.logger.error(`error perform inference endpoint API: ${err}`);
      throw err;
    }
  }

  private async streamAPI({
    input,
    signal,
  }: ChatCompleteParams & { signal?: AbortSignal }): Promise<StreamingResponse> {
    const response = await this.performInferenceApi(
      { inference_id: this.inferenceId, input, task_type: this.taskType as InferenceTaskType },
      true,
      signal
    );

    return (response as unknown as Stream).pipe(new PassThrough());
  }

  /**
   *  takes input. It calls the streamApi method to make a
   *  request to the Inference API with the message. It then returns a Transform stream
   *  that pipes the response from the API through the transformToString function,
   *  which parses the proprietary response into a string of the response text alone
   * @param input A message to be sent to the API
   * @signal abort signal
   */
  public async performApiCompletionStream({
    input,
    signal,
  }: ChatCompleteParams & { signal?: AbortSignal }): Promise<IncomingMessage> {
    const res = (await this.streamAPI({
      input,
      signal,
    })) as unknown as IncomingMessage;
    return res;
  }
}
