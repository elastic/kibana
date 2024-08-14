/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { handleLogTypeDetection } from './detection';
import type { LogTypeDetectionState } from '../../types';
import { logTypeDetectionTestState } from '../../../__jest__/fixtures/log_type_detection';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';

const mockLlm = new FakeLLM({
  response: '{ "log_type": "structured"}',
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const testState: LogTypeDetectionState = logTypeDetectionTestState;

describe('Testing log type detection handler', () => {
  it('handleLogTypeDetection()', async () => {
    const response = await handleLogTypeDetection(testState, mockLlm);
    expect(response.logType).toStrictEqual('structured');
    expect(response.lastExecutedChain).toBe('logTypeDetection');
  });
});
