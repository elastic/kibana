/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { get } from 'lodash/fp';

import { ChatOpenAI } from 'langchain/chat_models/openai';
import { Stream } from 'openai/streaming';
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions';
import { InvokeAIActionParamsSchema, RequestBody } from '../types';

const LLM_TYPE = 'ActionsClientChatOpenAI';

interface ActionsClientChatOpenAIParams {
  actions: ActionsPluginStart;
  connectorId: string;
  llmType?: string;
  logger: Logger;
  request: KibanaRequest<unknown, unknown, RequestBody>;
  streaming?: boolean;
  traceId?: string;
}

export class ActionsClientChatOpenAI extends ChatOpenAI {
  // set streaming to true always
  streaming = true;
  // Local `llmType` as it can change and needs to be accessed by abstract `_llmType()` method
  // Not using getter as `this._llmType()` is called in the constructor via `super({})`
  protected llmType: string;
  // ChatOpenAI class needs these, but they do not matter as we override the openai client with the actions client
  azureOpenAIApiKey = '';
  openAIApiKey = '';

  // Kibana variables
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest<unknown, unknown, RequestBody>;
  #actionResultData: string;
  #traceId: string;
  constructor({
    actions,
    connectorId,
    traceId = uuidv4(),
    llmType,
    logger,
    request,
  }: ActionsClientChatOpenAIParams) {
    super({
      azureOpenAIApiKey: 'nothing',
      azureOpenAIApiDeploymentName: 'nothing',
      azureOpenAIApiInstanceName: 'nothing',
      azureOpenAIBasePath: 'nothing',
      azureOpenAIApiVersion: 'nothing',
      openAIApiKey: '',
    });

    this.#actions = actions;
    this.#connectorId = connectorId;
    this.#traceId = traceId;
    this.llmType = llmType ?? LLM_TYPE;
    this.#logger = logger;
    this.#request = request;
    this.#actionResultData = '';
    this.streaming = true;
  }

  getActionResultData(): string {
    return this.#actionResultData;
  }

  _llmType() {
    return this.llmType;
  }

  // Model type needs to be `base_chat_model` to work with LangChain OpenAI Tools
  // We may want to make this configurable (ala _llmType) if different agents end up requiring different model types
  // See: https://github.com/langchain-ai/langchainjs/blob/fb699647a310c620140842776f4a7432c53e02fa/langchain/src/agents/openai/index.ts#L185
  _modelType() {
    return 'base_chat_model';
  }

  async completionWithRetry(
    request: ChatCompletionCreateParamsStreaming
  ): Promise<AsyncIterable<ChatCompletionChunk>>;

  async completionWithRetry(
    request: ChatCompletionCreateParamsNonStreaming
  ): Promise<ChatCompletion>;

  async completionWithRetry(
    completionRequest: ChatCompletionCreateParamsStreaming | ChatCompletionCreateParamsNonStreaming
  ): Promise<AsyncIterable<ChatCompletionChunk> | ChatCompletion> {
    if (!completionRequest.stream) {
      // fallback for typescript, should never be hit
      return super.completionWithRetry(completionRequest);
    }
    return this.caller.call(async () => {
      const requestBody = this.formatRequestForActionsClient(completionRequest);
      // create an actions client from the authenticated request context:
      const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

      const actionResult = await actionsClient.execute(requestBody);

      if (actionResult.status === 'error') {
        throw new Error(
          `${LLM_TYPE}: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
        );
      }

      // cast typing as this is the contract of the actions client
      const result = get('data', actionResult) as Array<Stream<ChatCompletionChunk>>;

      if (result.length === 0) {
        throw new Error(`${LLM_TYPE}: action result data is empty ${actionResult}`);
      }

      return result[0];
    });
  }
  formatRequestForActionsClient(completionRequest: ChatCompletionCreateParamsStreaming): {
    actionId: string;
    params: {
      // InvokeAIActionParamsSchema
      subActionParams: InvokeAIActionParamsSchema;
      subAction: string;
    };
  } {
    this.#logger.debug(
      `ActionsClientChatOpenAI#formatRequestForActionsClient ${
        this.#traceId
      } assistantMessage:\n${JSON.stringify('todo')} `
    );

    // create a new connector request body with the assistant message:
    return {
      actionId: this.#connectorId,
      params: {
        ...this.#request.body.params, // the original request body params
        // stream must already be true here
        subAction: 'invokeAsyncIterator',
        subActionParams: {
          model: completionRequest.model,
          ...(completionRequest.n !== null ? { n: completionRequest.n } : {}),
          ...(completionRequest.stop !== null ? { stop: completionRequest.stop } : {}),
          ...(completionRequest.temperature !== null
            ? { temperature: completionRequest.temperature }
            : {}),
          functions: completionRequest.functions,
          // overrides from client request, such as model
          ...this.#request.body.params.subActionParams,
          // ensure we take the messages from the completion request, not the client request
          messages: completionRequest.messages.map((message) => ({
            role: message.role,
            content: message.content ?? '',
            ...('name' in message ? { name: message?.name } : {}),
            ...('function_call' in message ? { function_call: message?.function_call } : {}),
            ...('tool_calls' in message ? { tool_calls: message?.tool_calls } : {}),
            ...('tool_call_id' in message ? { tool_call_id: message?.tool_call_id } : {}),
          })),
        },
      },
    };
  }
}
