/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { getModel } from '../../providers/bedrock';
import { handleErrors } from './errors';
import { RelatedState } from '../../types';
import {
  relatedTestState,
  relatedMockProcessors,
  relatedExpectedHandlerResponse,
} from '../../../__jest__/fixtures/related';

const mockLlm = new FakeLLM({
  response: JSON.stringify(relatedMockProcessors, null, 2),
});

jest.mock('../../providers/bedrock', () => ({
  getModel: jest.fn(),
}));
const testState: RelatedState = relatedTestState;

describe('Testing related handler', () => {
  beforeEach(() => {
    (getModel as jest.Mock).mockReturnValue(mockLlm);
  });
  it('handleErrors()', async () => {
    const response = await handleErrors(testState);
    expect(response.currentPipeline).toStrictEqual(relatedExpectedHandlerResponse.currentPipeline);
    expect(response.lastExecutedChain).toBe('error');
  });
});
