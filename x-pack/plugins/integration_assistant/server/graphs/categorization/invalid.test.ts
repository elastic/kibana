/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { getModel } from '../../providers/bedrock';
import { handleInvalidCategorization } from './invalid';
import { CategorizationState } from '../../types';
import {
  categorizationTestState,
  categorizationMockProcessors,
  categorizationExpectedHandlerResponse,
} from '../../../__jest__/fixtures/categorization';

const mockLlm = new FakeLLM({
  response: JSON.stringify(categorizationMockProcessors, null, 2),
});

jest.mock('../../providers/bedrock', () => ({
  getModel: jest.fn(),
}));
const testState: CategorizationState = categorizationTestState;

describe('Testing categorization handler', () => {
  beforeEach(() => {
    (getModel as jest.Mock).mockReturnValue(mockLlm);
  });
  it('handleInvalidCategorization()', async () => {
    const response = await handleInvalidCategorization(testState);
    expect(response.currentPipeline).toStrictEqual(
      categorizationExpectedHandlerResponse.currentPipeline
    );
    expect(response.lastExecutedChain).toBe('invalidCategorization');
  });
});
