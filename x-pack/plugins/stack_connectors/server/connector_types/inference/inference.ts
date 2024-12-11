/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { Stream } from 'openai/streaming';

import { PassThrough } from 'stream';
import { IncomingMessage } from 'http';

import { AxiosError } from 'axios';
import {
  InferenceInferenceRequest,
  InferenceInferenceResponse,
  InferenceTaskType,
} from '@elastic/elasticsearch/lib/api/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import { TransportRequestParams } from '@elastic/elasticsearch';
import {
  ChatCompleteParamsSchema,
  RerankParamsSchema,
  SparseEmbeddingParamsSchema,
  TextEmbeddingParamsSchema,
  UnifiedChatCompleteParamsSchema,
} from '../../../common/inference/schema';
import {
  Config,
  Secrets,
  ChatCompleteParams,
  ChatCompleteResponse,
  RerankParams,
  RerankResponse,
  SparseEmbeddingParams,
  SparseEmbeddingResponse,
  TextEmbeddingParams,
  TextEmbeddingResponse,
  UnifiedChatCompleteParams,
  UnifiedChatCompleteResponse,
  DashboardActionParams,
  DashboardActionResponse,
} from '../../../common/inference/types';
import { SUB_ACTION } from '../../../common/inference/constants';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';

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
      name: SUB_ACTION.UNIFIED_COMPLETION,
      method: 'performApiUnifiedCompletionStream',
      schema: UnifiedChatCompleteParamsSchema,
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

    this.registerSubAction({
      name: SUB_ACTION.COMPLETION_ASYNC_ITERATOR,
      method: 'performApiUnifiedCompletionAsyncIterator',
      schema: UnifiedChatCompleteParamsSchema,
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
    return response.completion!;
  }

  /**
   * responsible for making a esClient inference method to perform chat completetion task endpoint and returning the service response data
   * @param input the text on which you want to perform the inference task.
   * @signal abort signal
   */
  public async performApiUnifiedCompletionStream(
    params: UnifiedChatCompleteParams & { signal?: AbortSignal }
  ): Promise<UnifiedChatCompleteResponse> {
    const request: TransportRequestParams = {
      method: 'POST',
      path: `_inference/completion/${this.inferenceId}/_unified`,
      body: params.body,
    };
    const response = await this.esClient.transport.request<UnifiedChatCompleteResponse>(request, {
      headers: {
        ['Content-Type']: 'dont-compress-this',
      },
    });

    return response;
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

  /**
   * Streamed requests (langchain)
   * Uses the official OpenAI Node library, which handles Server-sent events for you.
   * @param params - the request body
   * @returns {
   *  consumerStream: Stream<UnifiedChatCompleteResponse>; the result to be read/transformed on the server and sent to the client via Server Sent Events
   *  tokenCountStream: Stream<UnifiedChatCompleteResponse>; the result for token counting stream
   * }
   */
  public async performApiUnifiedCompletionAsyncIterator(
    params: UnifiedChatCompleteParams & { signal?: AbortSignal },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{
    consumerStream: Stream<UnifiedChatCompleteResponse>;
    tokenCountStream: Stream<UnifiedChatCompleteResponse>;
  }> {
    try {
      connectorUsageCollector.addRequestBodyBytes(undefined, params.body);
      const stream = await this.esClient.transport.request<Stream<UnifiedChatCompleteResponse>>({
        method: 'POST',
        path: `_inference/completion/${this.inferenceId}/_unified`,
        body: params.body,
      });
      // splits the stream in two, teed[0] is used for the UI and teed[1] for token tracking
      const teed = stream.tee();
      return { consumerStream: teed[0], tokenCountStream: teed[1] };
      // since we do not use the sub action connector request method, we need to do our own error handling
    } catch (e) {
      const errorMessage = this.getResponseErrorMessage(e);
      throw new Error(errorMessage);
    }
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
  }: ChatCompleteParams & { signal?: AbortSignal }): Promise<PassThrough> {
    const response = await this.performInferenceApi(
      { inference_id: this.inferenceId, input, task_type: this.taskType as InferenceTaskType },
      true,
      signal
    );
    return (response as unknown as IncomingMessage).pipe(new PassThrough());
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
}
