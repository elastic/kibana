/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { BaseLLMCallOptions, LLM } from 'langchain/llms/base';

import { PassThrough, Readable } from 'stream';
import { Promise } from 'cypress/types/cy-bluebird';
import { BaseLanguageModelInput } from 'langchain/base_language';
import { CallbackManagerForLLMRun } from 'langchain/callbacks';
import { GenerationChunk, LLMResult } from 'langchain/schema';
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

  // Local `llmType` as it can change and needs to be accessed by abstract `_llmType()` method
  // Not using getter as `this._llmType()` is called in the constructor via `super({})`
  protected llmType: string;

  constructor({
    actions,
    connectorId,
    llmType,
    logger,
    request,
  }: {
    actions: ActionsPluginStart;
    connectorId: string;
    llmType?: string;
    logger: Logger;
    request: KibanaRequest<unknown, unknown, RequestBody>;
  }) {
    super({});

    this.#actions = actions;
    this.#connectorId = connectorId;
    this.llmType = llmType ?? LLM_TYPE;
    this.#logger = logger;
    this.#request = request;
    this.#actionResultData = '';
    this.#stream = new PassThrough();
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

  async *_streamAsyncIterator(stream) {
    // Get a lock on the stream
    const reader = stream.getReader();
    console.log('is it a reader??', reader);

    try {
      while (true) {
        // Read from the stream
        const { done, value } = await reader.read();
        // Exit if we're done
        if (done) return;
        // Else yield the chunk
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }
  async _generate(
    prompts: string[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<LLMResult> {
    console.log('do we do this? _generate');
    console.log('promptspromptsprompts', prompts);
    console.log('optionsoptionsoptions', options);
    const subPrompts = chunkArray(prompts, 20);
    const choices = [];
    // const tokenUsage: TokenUsage = {};

    const params = this.invocationParams(options);
    console.log('paramsparamsparams', params);
    console.log('this.#request.body.params.subAction', this.#request.body.params.subAction);

    //
    // if (params.max_tokens === -1) {
    //   if (prompts.length !== 1) {
    //     throw new Error('max_tokens set to -1 not supported for multiple inputs');
    //   }
    //   params.max_tokens = await calculateMaxTokens({
    //     prompt: prompts[0],
    //     // Cast here to allow for other models that may not fit the union
    //     modelName: this.modelName as TiktokenModel,
    //   });
    // }

    // convert the Langchain prompt to an assistant message:
    const assistantMessage = getMessageContentAndRole(prompts[0]);
    // console.log('here prompts[0]', prompts[0]);
    this.#logger.debug(
      `ActionsClientLlm#_call assistantMessage:\n${JSON.stringify(assistantMessage)} `
    );

    const subActionParams =
      // TODO: Remove in part 2 of streaming work for security solution
      // tracked here: https://github.com/elastic/security-team/issues/7363
      this.#request.body.params.subAction === 'invokeAI'
        ? {
            ...this.#request.body.params.subActionParams, // the original request body params.subActionParams
            messages: [assistantMessage], // the assistant message
          }
        : {
            body: JSON.stringify({
              ...this.#request.body.params.subActionParams, // the original request body params.subActionParams
              messages: [assistantMessage], // the assistant message
            }),
            stream: true,
          };

    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        ...this.#request.body.params, // the original request body params
        subActionParams,
      },
    };

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);
    //
    // const actionResult = await actionsClient.execute(requestBody);
    console.log('here 000', subPrompts);
    for (let i = 0; i < subPrompts.length; i += 1) {
      console.log('here 00');
      const data =
        this.#request.body.params.subAction !== 'invokeAI'
          ? await (async () => {
              let response;
              console.log('here 0');
              const stream = await actionsClient.execute(requestBody);
              console.log('here 1:');
              this.#stream = (stream.data as unknown as Readable).pipe(new PassThrough());
              console.log('here 2', this.#stream);

              for await (const message of this.#stream) {
                //   // …
                // }
                //
                // for await (const message of this.#stream) {
                console.log('here 3', message);
                // TODO: message is not what we are expecting

                // on the first message set the response properties
                if (!response) {
                  response = {
                    id: message.id,
                    object: message.object,
                    created: message.created,
                    model: message.model,
                  };
                }

                // on all messages, update choice
                for (const part of message.choices) {
                  console.log('here 4');

                  if (!choices[part.index]) {
                    choices[part.index] = part;
                  } else {
                    const choice = choices[part.index];
                    choice.text += part.text;
                    choice.finish_reason = part.finish_reason;
                    choice.logprobs = part.logprobs;
                  }
                  void runManager?.handleLLMNewToken(part.text, {
                    prompt: Math.floor(part.index / 1),
                    completion: part.index % 1,
                  });
                }
              }
              if (options.signal?.aborted) {
                throw new Error('AbortError');
              }
              console.log('here 5');

              return { ...response, choices };
            })()
          : await actionsClient.execute(requestBody);
      console.log('datadatadata', data);
      choices.push(...data.choices);
      // const {
      //   completion_tokens: completionTokens,
      //   prompt_tokens: promptTokens,
      //   total_tokens: totalTokens,
      // } = data.usage
      //   ? data.usage
      //   : {
      //       completion_tokens: undefined,
      //       prompt_tokens: undefined,
      //       total_tokens: undefined,
      //     };
      //
      // if (completionTokens) {
      //   tokenUsage.completionTokens = (tokenUsage.completionTokens ?? 0) + completionTokens;
      // }
      //
      // if (promptTokens) {
      //   tokenUsage.promptTokens = (tokenUsage.promptTokens ?? 0) + promptTokens;
      // }
      //
      // if (totalTokens) {
      //   tokenUsage.totalTokens = (tokenUsage.totalTokens ?? 0) + totalTokens;
      // }
    }

    const generations = chunkArray(choices, 1).map((promptChoices) =>
      promptChoices.map((choice) => ({
        text: choice.text ?? '',
        generationInfo: {
          finishReason: choice.finish_reason,
          logprobs: choice.logprobs,
        },
      }))
    );
    return {
      generations,
      llmOutput: { tokenUsage: {} },
    };
  }

  async *_streamResponseChunks(
    input: string,
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<GenerationChunk> {
    console.log('do we do this? _streamResponseChunks');

    const params = {
      ...this.invocationParams(options),
      prompt: input,
      stream: true as const,
    };
    const stream = await this.completionWithRetry(params, options);
    for await (const data of stream) {
      const choice = data?.choices[0];
      if (!choice) {
        continue;
      }
      const chunk = new GenerationChunk({
        text: choice.text,
        generationInfo: {
          finishReason: choice.finish_reason,
        },
      });
      yield chunk;

      void runManager?.handleLLMNewToken(chunk.text ?? '');
    }
    if (options.signal?.aborted) {
      throw new Error('AbortError');
    }
  }
  //
  // stream(
  //   input: BaseLanguageModelInput,
  //   options?: Partial<BaseLLMCallOptions>
  // ): Promise<IterableReadableStream<string>> {
  //   console.log('do we do this? stream');
  //
  //   return super.stream(input, options);
  // }

  async _call(prompt: string): Promise<string> {
    // convert the Langchain prompt to an assistant message:
    const assistantMessage = getMessageContentAndRole(prompt);
    this.#logger.debug(
      `ActionsClientLlm#_call assistantMessage:\n${JSON.stringify(assistantMessage)} `
    );

    const subActionParams =
      // TODO: Remove in part 2 of streaming work for security solution
      // tracked here: https://github.com/elastic/security-team/issues/7363
      this.#request.body.params.subAction === 'invokeAI'
        ? {
            ...this.#request.body.params.subActionParams, // the original request body params.subActionParams
            messages: [assistantMessage], // the assistant message
          }
        : {
            body: JSON.stringify({
              ...this.#request.body.params.subActionParams, // the original request body params.subActionParams
              messages: [assistantMessage], // the assistant message
            }),
            stream: true,
          };

    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        ...this.#request.body.params, // the original request body params
        subActionParams,
      },
    };

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);
    //
    // const actionResult = await actionsClient.execute(requestBody);
    //
    // if (actionResult.status === 'error') {
    //   throw new Error(
    //     `${LLM_TYPE}: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
    //   );
    // }
    // // TODO: handle errors from the connector
    // const content = get('data.message', actionResult);
    //
    // if (typeof content === 'string') {
    //   this.#actionResultData = content; // save the raw response from the connector, because that's what the assistant expects
    //
    //   return content; // per the contact of _call, return a string
    // }
    // const readable = get('data', actionResult);
    // console.log('readable getting defined now');
    // this.#stream = (readable as Readable).pipe(new PassThrough());
    console.log('returning dummy data');
    return JSON.stringify('readable');
    // if (typeof content !== 'string') {
    //   throw new Error(
    //     `${LLM_TYPE}: content should be a string, but it had an unexpected type: ${typeof content}`
    //   );
    // }
  }
}
