/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { BaseLLMCallOptions, LLM } from 'langchain/llms/base';
import { get } from 'lodash/fp';

import { PassThrough, Readable } from 'stream';
import { Promise } from 'cypress/types/cy-bluebird';
import { BaseLanguageModelInput } from 'langchain/base_language';
import { CallbackManagerForLLMRun } from 'langchain/callbacks';
import { GenerationChunk } from 'langchain/schema';
import { finished } from 'stream/promises';
import { RequestBody } from '../types';
import { getMessageContentAndRole } from '../helpers';

const LLM_TYPE = 'ActionsClientLlm';
export const chunkArray = (arr, chunkSize) =>
  arr.reduce((chunks, elem, index) => {
    const chunkIndex = Math.floor(index / chunkSize);
    const chunk = chunks[chunkIndex] || [];

    chunks[chunkIndex] = chunk.concat([elem]);
    return chunks;
  }, []);
export class ActionsClientLlm extends LLM {
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest<unknown, unknown, RequestBody>;
  #actionResultData: string;
  #stream: Readable;

  streaming = false;

  // Local `llmType` as it can change and needs to be accessed by abstract `_llmType()` method
  // Not using getter as `this._llmType()` is called in the constructor via `super({})`
  protected llmType: string;

  constructor({
    actions,
    connectorId,
    llmType,
    logger,
    request,
    streaming,
  }: {
    actions: ActionsPluginStart;
    connectorId: string;
    llmType?: string;
    logger: Logger;
    request: KibanaRequest<unknown, unknown, RequestBody>;
    streaming: boolean;
  }) {
    super({});

    this.#actions = actions;
    this.#connectorId = connectorId;
    this.llmType = llmType ?? LLM_TYPE;
    this.#logger = logger;
    this.#request = request;
    this.#actionResultData = '';
    this.#stream = new PassThrough();
    this.streaming = streaming ?? this.streaming;
    console.log('IS IT STREAM?', this.streaming);
  }

  getActionResultData(): string {
    return this.#actionResultData;
  }

  getActionResultStream(): Readable {
    return this.#stream;
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

  async *_streamIterator(
    input: BaseLanguageModelInput,
    options?: BaseLLMCallOptions
  ): AsyncGenerator<string> {
    console.log('do we do this? _streamIterator');
    return super._streamIterator(input, options);
  }

  async _getResponseFromStream(stream: Readable): Promise<string> {
    let responseBody: string = '';
    stream.on('data', (chunk: string) => {
      responseBody += chunk.toString();
    });
    await finished(stream);
    return responseBody;
  }

  async *_streamResponseChunks(
    prompt: string,
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<GenerationChunk> {
    console.log('do we do this? _streamResponseChunks');

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);
    const actionStreamResult = await actionsClient.execute(
      this.formatRequestForActionsClient(prompt)
    );
    console.log('THIS SHOULD BE FIRST', actionStreamResult);

    this.#stream = actionStreamResult.data as Readable;

    for await (const data of (actionStreamResult.data as Readable).pipe(new PassThrough())) {
      const choice = data.toString();
      if (!choice) {
        throw new Error('this seems bad');
      }
      const chunk = new GenerationChunk({
        text: choice,
      });
      console.log('yielding chunks', chunk);
      yield chunk;

      void runManager?.handleLLMNewToken(chunk.text ?? '');
    }
    if (options.signal?.aborted) {
      throw new Error('AbortError');
    }
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

  async _call(
    prompt: string,
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    if (this.streaming) {
      // const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);
      // const actionStreamResult = await actionsClient.execute(
      //   this.formatRequestForActionsClient(prompt)
      // );
      // console.log('actionStreamResult', actionStreamResult);
      //
      // this.#stream = (actionStreamResult.data as Readable).pipe(new PassThrough());
      //
      // let responseBody: string = '';
      // this.#stream.on('data', (chunk: string) => {
      //   responseBody += chunk.toString();
      // });
      // await finished(this.#stream);
      // return responseBody;
      const stream = this._streamResponseChunks(prompt, options, runManager);
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
    }

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

    const actionResult = await actionsClient.execute(this.formatRequestForActionsClient(prompt));

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

    return content; // per the contact of _call, return a string
  }
}
