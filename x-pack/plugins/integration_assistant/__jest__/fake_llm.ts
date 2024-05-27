/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenerationChunk } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { LLM, BaseLLMParams } from '@langchain/core/language_models/llms';

/**
 * Interface for the input parameters specific to the Fake List model.
 */
export interface FakeListInput extends BaseLLMParams {
  /** Responses to return */
  responses: string[];

  /** Time to sleep in milliseconds between responses */
  sleep?: number;
}

/**
 * A fake LLM that returns a predefined list of responses. It can be used for
 * testing purposes.
 */
export class FakeListLLM extends LLM {
  static lc_name() {
    return 'FakeListLLM';
  }

  responses: string[];

  i = 0;

  sleep?: number;

  constructor({ responses, sleep }: FakeListInput) {
    super({});
    this.responses = responses;
    this.sleep = sleep;
  }

  _llmType() {
    return 'fake-list';
  }

  async _call(
    _prompt: string,
    _options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    const response = this._currentResponse();
    this._incrementResponse();
    await this._sleepIfRequested();

    return response;
  }

  _currentResponse() {
    return this.responses[this.i];
  }

  _incrementResponse() {
    if (this.i < this.responses.length - 1) {
      this.i += 1;
    } else {
      this.i = 0;
    }
  }

  async *_streamResponseChunks(
    _input: string,
    _options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<GenerationChunk> {
    const response = this._currentResponse();
    this._incrementResponse();

    for await (const text of response) {
      await this._sleepIfRequested();
      yield this._createResponseChunk(text);
    }
  }

  async _sleepIfRequested() {
    if (this.sleep !== undefined) {
      await this._sleep();
    }
  }

  async _sleep() {
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), this.sleep);
    });
  }

  _createResponseChunk(text: string): GenerationChunk {
    return new GenerationChunk({
      text,
      generationInfo: {},
    });
  }
}
