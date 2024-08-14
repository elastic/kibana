/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { getLogTypeDetectionGraph } from './graph';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';

const mockLlm = new FakeLLM({
  response: '{"log_type": "structured"}',
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

describe('LogTypeDetectionGraph', () => {
  describe('Compiling and Running', () => {
    it('Ensures that the graph compiles', async () => {
      // When getLogTypeDetectionGraph runs, langgraph compiles the graph it will error if the graph has any issues.
      // Common issues for example detecting a node has no next step, or there is a infinite loop between them.
      try {
        await getLogTypeDetectionGraph(mockLlm);
      } catch (error) {
        fail(`getLogTypeDetectionGraph threw an error: ${error}`);
      }
    });
  });
});
