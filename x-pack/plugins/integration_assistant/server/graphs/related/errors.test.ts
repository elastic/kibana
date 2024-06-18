/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { handleErrors } from './errors';
import type { RelatedState } from '../../types';
import {
  relatedTestState,
  relatedMockProcessors,
  relatedExpectedHandlerResponse,
} from '../../../__jest__/fixtures/related';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';

const mockLlm = new FakeLLM({
  response: JSON.stringify(relatedMockProcessors, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const testState: RelatedState = relatedTestState;

describe('Testing related handler', () => {
  it('handleErrors()', async () => {
    const response = await handleErrors(testState, mockLlm);
    expect(response.currentPipeline).toStrictEqual(relatedExpectedHandlerResponse.currentPipeline);
    expect(response.lastExecutedChain).toBe('error');
  });
});
