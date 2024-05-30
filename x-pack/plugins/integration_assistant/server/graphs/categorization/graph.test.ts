/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { FakeLLM } from '@langchain/core/utils/testing';
import { getCategorizationGraph } from './graph';
import { getModel } from '../../providers/bedrock';
import {
  categorizationExpectedResults,
  categorizationErrorMockedResponse,
  categorizationInitialMockedResponse,
  categorizationInvalidMockedResponse,
  categorizationReviewMockedResponse,
  categorizationInitialPipeline,
  testPipelineError,
  testPipelineValidResult,
  testPipelineInvalidEcs,
} from '../../../__jest__/fixtures/categorization';
import { mockedRequestWithPipeline } from '../../../__jest__/fixtures';
import { handleReview } from './review';
import { handleCategorization } from './categorization';
import { handleErrors } from './errors';
import { handleInvalidCategorization } from './invalid';
import { testPipeline, combineProcessors } from '../../util';

const mockLlm = new FakeLLM({
  response: "I'll callback later.",
});

jest.mock('./errors');
jest.mock('./review');
jest.mock('./categorization');
jest.mock('./invalid');
jest.mock('../../providers/bedrock', () => ({
  getModel: jest.fn(),
}));

jest.mock('../../util/pipeline', () => ({
  testPipeline: jest.fn(),
}));

jest.mock('../../util/es', () => {
  return {
    ESClient: {
      setClient: jest.fn(),
      getClient: jest.fn(),
    },
  };
});

describe('runCategorizationGraph', () => {
  const mockClient = {
    asCurrentUser: {
      ingest: {
        simulate: jest.fn(),
      },
    },
  } as unknown as IScopedClusterClient;
  beforeEach(() => {
    // Mocked responses for each node that requires an LLM API call/response.
    const mockInvokeCategorization = jest
      .fn()
      .mockResolvedValue(categorizationInitialMockedResponse);
    const mockInvokeError = jest.fn().mockResolvedValue(categorizationErrorMockedResponse);
    const mockInvokeInvalid = jest.fn().mockResolvedValue(categorizationInvalidMockedResponse);
    const mockInvokeReview = jest.fn().mockResolvedValue(categorizationReviewMockedResponse);

    // Return a fake LLM to prevent API calls from being made, or require API credentials
    (getModel as jest.Mock).mockReturnValue(mockLlm);

    // We do not care about ES in these tests, the mock is just to prevent errors.

    // After this is triggered, the mock of TestPipeline will trigger the expected error, to route to error handler
    (handleCategorization as jest.Mock).mockImplementation(async () => ({
      currentPipeline: categorizationInitialPipeline,
      currentProcessors: await mockInvokeCategorization(),
      reviewed: false,
      finalized: false,
      lastExecutedChain: 'categorization',
    }));
    // Error pipeline resolves it, though the responce includes an invalid categorization
    (handleErrors as jest.Mock).mockImplementation(async () => ({
      currentPipeline: categorizationInitialPipeline,
      currentProcessors: await mockInvokeError(),
      reviewed: false,
      finalized: false,
      lastExecutedChain: 'error',
    }));
    // Invalid categorization is resolved and returned correctly, which routes it to a review
    (handleInvalidCategorization as jest.Mock).mockImplementation(async () => ({
      currentPipeline: categorizationInitialPipeline,
      currentProcessors: await mockInvokeInvalid(),
      reviewed: false,
      finalized: false,
      lastExecutedChain: 'invalidCategorization',
    }));
    // After the review it should route to modelOutput and finish.
    (handleReview as jest.Mock).mockImplementation(async () => {
      const currentProcessors = await mockInvokeReview();
      const currentPipeline = combineProcessors(categorizationInitialPipeline, currentProcessors);
      return {
        currentProcessors,
        currentPipeline,
        reviewed: true,
        finalized: false,
        lastExecutedChain: 'review',
      };
    });
  });

  it('Ensures that the graph compiles', async () => {
    try {
      await getCategorizationGraph(mockClient);
    } catch (error) {
      // noop
    }
  });

  it('Runs the whole graph, with mocked outputs from the LLM.', async () => {
    const categorizationGraph = await getCategorizationGraph(mockClient);

    (testPipeline as jest.Mock)
      .mockResolvedValueOnce(testPipelineValidResult)
      .mockResolvedValueOnce(testPipelineError)
      .mockResolvedValueOnce(testPipelineInvalidEcs)
      .mockResolvedValueOnce(testPipelineValidResult)
      .mockResolvedValueOnce(testPipelineValidResult)
      .mockResolvedValueOnce(testPipelineValidResult);

    let response;
    try {
      response = await categorizationGraph.invoke(mockedRequestWithPipeline);
    } catch (e) {
      // noop
    }

    expect(response.results).toStrictEqual(categorizationExpectedResults);

    // Check if the functions were called
    expect(handleCategorization).toHaveBeenCalled();
    expect(handleErrors).toHaveBeenCalled();
    expect(handleInvalidCategorization).toHaveBeenCalled();
    expect(handleReview).toHaveBeenCalled();
  });
});
