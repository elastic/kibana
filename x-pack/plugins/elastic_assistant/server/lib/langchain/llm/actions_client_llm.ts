/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { LLM } from 'langchain/llms/base';
import { get } from 'lodash/fp';

import { CallbackManagerForLLMRun } from 'langchain/callbacks';
import { GenerationChunk } from 'langchain/schema';
import { Readable } from 'stream';
import { RequestBody } from '../types';
import { getMessageContentAndRole } from '../helpers';

const LLM_TYPE = 'ActionsClientLlm';

interface ActionsClientLlmParams {
  actions: ActionsPluginStart;
  connectorId: string;
  llmType?: string;
  logger: Logger;
  request: KibanaRequest<unknown, unknown, RequestBody>;
  streaming?: boolean;
  traceId?: string;
}

export class ActionsClientLlm extends LLM {
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest<unknown, unknown, RequestBody>;
  #actionResultData: string;
  streaming = false;
  #traceId: string;

  // Local `llmType` as it can change and needs to be accessed by abstract `_llmType()` method
  // Not using getter as `this._llmType()` is called in the constructor via `super({})`
  protected llmType: string;

  constructor({
    actions,
    connectorId,
    traceId = uuidv4(),
    llmType,
    logger,
    request,
    streaming,
  }: ActionsClientLlmParams) {
    super({});

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
  formatRequestForActionsClient(prompt: string): {
    actionId: string;
    params: { subActionParams: { messages: Array<{ content?: string; role: string }> } };
  } {
    const assistantMessage = getMessageContentAndRole(prompt);
    this.#logger.debug(
      `ActionsClientLlm#_call assistantMessage:\n${JSON.stringify(assistantMessage)} `
    );
    // create a new connector request body with the assistant message:
    return {
      actionId: this.#connectorId,
      params: {
        ...this.#request.body.params, // the original request body params
        subActionParams: {
          ...this.#request.body.params.subActionParams, // the original request body params.subActionParams
          messages: [assistantMessage], // the assistant message
        },
      },
    };
  }
  async *_streamResponseChunks(
    prompt: string,
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<GenerationChunk> {
    console.log('THIS SHOULD BE _streamResponseChunks', this.llmType);
    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);
    const actionStreamResult = await actionsClient.execute(
      this.formatRequestForActionsClient(prompt)
    );

    console.log('THIS SHOULD BE actionStreamResult', actionStreamResult);
    if (actionStreamResult.status === 'error') {
      throw new Error(
        `${LLM_TYPE}: action result status is error: ${actionStreamResult?.message} - ${actionStreamResult?.serviceMessage}`
      );
    }
    // Initialize an empty string to store the OpenAI buffer.
    let openAIBuffer: string = '';
    for await (const data of actionStreamResult.data as Readable) {
      const decoder = new TextDecoder();
      const decoded = decoder.decode(data);
      console.log('decoded???', decoded);
      const lines = decoded.split('\n');
      lines[0] = openAIBuffer + lines[0];
      openAIBuffer = lines.pop() || '';
      console.log('lines???', lines);
      const chunk = new GenerationChunk({
        text: getOpenAIChunks(lines).join(''),
      });
      yield chunk;
      void runManager?.handleLLMNewToken(chunk.text ?? '');
    }
    console.log('AFTER BUFFER????', { openAIBuffer, isAborted: options.signal?.aborted });
    if (options.signal?.aborted) {
      throw new Error('AbortError');
    }
  }

  async _call(
    prompt: string,
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    console.log('WE ARE HERE at start of _call');
    if (this.streaming) {
      try {
        const stream = this._streamResponseChunks(prompt, options, runManager);
        console.log('THIS SHOULD BE stream', stream);
        let finalResult: GenerationChunk | undefined;
        for await (const chunk of stream) {
          if (finalResult === undefined) {
            finalResult = chunk;
          } else {
            finalResult = finalResult.concat(chunk);
          }
        }
        console.log('finalResult', finalResult);
        return finalResult?.text ?? '';
      } catch (err) {
        console.log('WE ARE HERE ERROR _call??????', err);
        return err;
      }
    }
    // convert the Langchain prompt to an assistant message:
    const assistantMessage = getMessageContentAndRole(prompt);
    this.#logger.debug(
      `ActionsClientLlm#_call\ntraceId: ${this.#traceId}\nassistantMessage:\n${JSON.stringify(
        assistantMessage
      )} `
    );
    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        ...this.#request.body.params, // the original request body params
        subActionParams: {
          ...this.#request.body.params.subActionParams, // the original request body params.subActionParams
          messages: [assistantMessage], // the assistant message
        },
      },
    };

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

    const actionResult = await actionsClient.execute(requestBody);

    if (actionResult.status === 'error') {
      throw new Error(
        `${LLM_TYPE}: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
      );
    }

    const content = get('data.message', actionResult);

    if (typeof content !== 'string') {
      throw new Error(
        `${LLM_TYPE}: content should be a string, but it had an unexpected type: ${typeof content}`
      );
    }
    this.#actionResultData = content; // save the raw response from the connector, because that's what the assistant expects

    console.log('WE ARE HERE at end of _call', content);
    return content; // per the contact of _call, return a string
  }
}
const getOpenAIChunks = (lines: string[]): string[] => {
  const nextChunk = lines
    .map((str) => str.substring(6))
    .filter((str) => !!str && str !== '[DONE]')
    .map((line) => {
      try {
        const openaiResponse = JSON.parse(line);
        return openaiResponse.choices[0]?.delta.content ?? '';
      } catch (err) {
        return '';
      }
    });
  return nextChunk;
};
