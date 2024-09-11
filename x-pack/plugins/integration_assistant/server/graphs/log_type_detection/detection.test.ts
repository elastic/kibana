/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { FakeLLM } from '@langchain/core/utils/testing';
import { logFormatDetectionTestState } from '../../../__jest__/fixtures/log_type_detection';
import type { LogFormatDetectionState } from '../../types';
import { handleLogFormatDetection } from './detection';

const model = new FakeLLM({
  response: '{ "log_type": "structured"}',
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: LogFormatDetectionState = logFormatDetectionTestState;

describe('Testing log type detection handler', () => {
  it('handleLogFormatDetection()', async () => {
    const response = await handleLogFormatDetection({ state, model });
    expect(response.samplesFormat).toStrictEqual({ name: 'structured' });
    expect(response.lastExecutedChain).toBe('logFormatDetection');
  });
});
