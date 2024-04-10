/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SimpleChatModel,
  type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { type BaseMessage } from '@langchain/core/messages';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/logging';
import { KibanaRequest } from '@kbn/core-http-server';
import { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';
import { v4 as uuidv4 } from 'uuid';
import { get } from 'lodash/fp';

export const getMessageContentAndRole = (prompt: string) => ({
  content: prompt,
  role: 'user',
});

export interface CustomChatModelInput extends BaseChatModelParams {
  actions: ActionsPluginStart;
  connectorId: string;
  logger: Logger;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
}

export class ActionsClientChatBedrock extends SimpleChatModel {
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  #traceId: string;

  constructor({ actions, connectorId, logger, request }: CustomChatModelInput) {
    super({});

    this.#actions = actions;
    this.#connectorId = connectorId;
    this.#traceId = uuidv4();
    this.#logger = logger;
    this.#request = request;
  }

  _llmType() {
    return 'custom';
  }

  async _call(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    if (!messages.length) {
      throw new Error('No messages provided.');
    }

    if (typeof messages[0].content !== 'string') {
      throw new Error('Multimodal messages are not supported.');
    }
    const prompt = messages[0].content;
    const assistantMessage = getMessageContentAndRole(prompt);
    this.#logger.debug(
      `ActionsClientChatBedrock#_call\ntraceId: ${
        this.#traceId
      }\nassistantMessage:\n${JSON.stringify(assistantMessage)} `
    );
    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        // hard code to non-streaming subaction as this class only supports non-streaming
        subAction: 'invokeAI',
        subActionParams: {
          model: this.#request.body.model,
          messages: [assistantMessage], // the assistant message
          temperature: 0,
          stopSequences: options?.stop,
        },
      },
    };

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

    const actionResult = await actionsClient.execute(requestBody);

    if (actionResult.status === 'error') {
      throw new Error(
        `ChatBedrock: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
      );
    }

    const content = get('data.message', actionResult);

    if (typeof content !== 'string') {
      throw new Error(
        `ChatBedrock: content should be a string, but it had an unexpected type: ${typeof content}`
      );
    }

    return content; // per the contact of _call, return a string
  }

  // async *_streamResponseChunks(
  //   messages: BaseMessage[],
  //   options: this['ParsedCallOptions'],
  //   runManager?: CallbackManagerForLLMRun
  // ): AsyncGenerator<ChatGenerationChunk> {
  //   if (!messages.length) {
  //     throw new Error('No messages provided.');
  //   }
  //   if (typeof messages[0].content !== 'string') {
  //     throw new Error('Multimodal messages are not supported.');
  //   }
  //   // Pass `runManager?.getChild()` when invoking internal runnables to enable tracing
  //   // await subRunnable.invoke(params, runManager?.getChild());
  //   for (const letter of messages[0].content.slice(0, this.n)) {
  //     yield new ChatGenerationChunk({
  //       message: new AIMessageChunk({
  //         content: letter,
  //       }),
  //       text: letter,
  //     });
  //     await runManager?.handleLLMNewToken(letter);
  //   }
  // }
}
