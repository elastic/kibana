/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OpenAI as OpenAIClient } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { get } from 'lodash/fp';

import { ChatOpenAI } from 'langchain/chat_models/openai';
import { RequestBody } from '../types';

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
  // ChatOpenAI variables
  streaming = false;
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
    streaming,
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
    this.streaming = streaming ?? this.streaming;
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
    completionRequest: OpenAIClient.Chat.ChatCompletionCreateParamsStreaming
  ): Promise<AsyncIterable<OpenAIClient.Chat.Completions.ChatCompletionChunk>> {
    return this.caller.call(async () => {
      const requestBody = this.formatRequestForActionsClient(completionRequest);
      // stream

      // create an actions client from the authenticated request context:
      const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

      const actionResult = await actionsClient.execute(requestBody);

      if (actionResult.status === 'error') {
        throw new Error(
          `${LLM_TYPE}: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
        );
      }

      // cast typing as this is the contract of the actions client
      const result = get(
        'data',
        actionResult
      ) as AsyncIterable<OpenAIClient.Chat.Completions.ChatCompletionChunk>;

      return result;
      // TODO validation
      // if (typeof content !== 'string') {
      //   throw new Error(
      //     `${LLM_TYPE}: content should be a string, but it had an unexpected type: ${typeof content}`
      //   );
      // }
      // this.#actionResultData = result; // save the raw response from the connector, because that's what the assistant expects
      // The type you're expecting from OpenAI is AsyncIterable where I am expecting IncomingMessage.
      // return (result as unknown as IncomingMessage).pipe(new PassThrough());
    });
  }
  formatRequestForActionsClient(
    completionRequest:
      | OpenAIClient.Chat.ChatCompletionCreateParamsStreaming
      | OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming
  ): {
    actionId: string;
    params: {
      // InvokeAIActionParamsSchema
      subActionParams: InvokeAIActionParamsSchema;
      subAction: string;
    };
  } {
    this.#logger.debug(
      `ActionsClientChatOpenAI#formatRequestForActionsClient assistantMessage:\n${JSON.stringify(
        'todo'
      )} `
    );

    // create a new connector request body with the assistant message:
    return {
      actionId: this.#connectorId,
      params: {
        ...this.#request.body.params, // the original request body params
        // TODO make dynamic
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
            ...('name' in message ? { name: message.name } : {}),
            ...('function_call' in message ? { function_call: message.function_call } : {}),
            ...('tool_calls' in message ? { tool_calls: message.tool_calls } : {}),
            ...('tool_call_id' in message ? { tool_call_id: message.tool_call_id } : {}),
          })),
        },
      },
    };
  }
}

interface InvokeAIActionParamsSchema {
  messages: Array<{
    role: string;
    content: string | OpenAIClient.Chat.ChatCompletionContentPart[];
    name?: string;
    function_call?: {
      arguments: string;
      name: string;
    };
    tool_calls?: Array<{
      id: string;

      function: {
        arguments: string;
        name: string;
      };

      type: string;
    }>;
    tool_call_id?: string;
  }>;
  model?: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming['model'];
  n?: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming['n'];
  stop?: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming['stop'];
  temperature?: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming['temperature'];
  functions?: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming['functions'];
}
