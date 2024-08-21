/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { handleDuplicates } from './duplicates';
import type { EcsMappingState } from '../../types';
import { ecsTestState } from '../../../__jest__/fixtures/ecs_mapping';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';

const mockLlm = new FakeLLM({
  response: '{ "message": "ll callback later."}',
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const testState: EcsMappingState = ecsTestState;

describe('Testing ecs handler', () => {
  it('handleDuplicates()', async () => {
    const response = await handleDuplicates(testState, mockLlm);
    expect(response.currentMapping).toStrictEqual({ message: 'll callback later.' });
    expect(response.lastExecutedChain).toBe('duplicateFields');
  });
});
