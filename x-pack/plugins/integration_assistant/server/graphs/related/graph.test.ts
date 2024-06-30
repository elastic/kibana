/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { FakeLLM } from '@langchain/core/utils/testing';
import { getRelatedGraph } from './graph';
import {
  relatedExpectedResults,
  relatedErrorMockedResponse,
  relatedInitialMockedResponse,
  relatedReviewMockedResponse,
  relatedInitialPipeline,
  testPipelineError,
  testPipelineValidResult,
} from '../../../__jest__/fixtures/related';
import { mockedRequestWithPipeline } from '../../../__jest__/fixtures';
import { handleReview } from './review';
import { handleRelated } from './related';
import { handleErrors } from './errors';
import { testPipeline, combineProcessors } from '../../util';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';

const mockLlm = new FakeLLM({
  response: "I'll callback later.",
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

jest.mock('./errors');
jest.mock('./review');
jest.mock('./related');

jest.mock('../../util/pipeline', () => ({
  testPipeline: jest.fn(),
}));

describe('runRelatedGraph', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        getMapping: jest.fn(),
      },
    },
  } as unknown as IScopedClusterClient;
  beforeEach(() => {
    // Mocked responses for each node that requires an LLM API call/response.
    const mockInvokeRelated = jest.fn().mockResolvedValue(relatedInitialMockedResponse);
    const mockInvokeError = jest.fn().mockResolvedValue(relatedErrorMockedResponse);
    const mockInvokeReview = jest.fn().mockResolvedValue(relatedReviewMockedResponse);

    // After this is triggered, the mock of TestPipeline will trigger the expected error, to route to error handler
    (handleRelated as jest.Mock).mockImplementation(async () => ({
      currentPipeline: relatedInitialPipeline,
      currentProcessors: await mockInvokeRelated(),
      reviewed: false,
      finalized: false,
      lastExecutedChain: 'related',
    }));
    // Error pipeline returns the correct response to trigger a review.
    (handleErrors as jest.Mock).mockImplementation(async () => ({
      currentPipeline: relatedInitialPipeline,
      currentProcessors: await mockInvokeError(),
      reviewed: false,
      finalized: false,
      lastExecutedChain: 'error',
    }));
    // After the review it should route to modelOutput and finish.
    (handleReview as jest.Mock).mockImplementation(async () => {
      const currentProcessors = await mockInvokeReview();
      const currentPipeline = combineProcessors(relatedInitialPipeline, currentProcessors);
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
      await getRelatedGraph(mockClient, mockLlm);
    } catch (error) {
      // noop
    }
  });

  it('Runs the whole graph, with mocked outputs from the LLM.', async () => {
    const relatedGraph = await getRelatedGraph(mockClient, mockLlm);

    (testPipeline as jest.Mock)
      .mockResolvedValueOnce(testPipelineValidResult)
      .mockResolvedValueOnce(testPipelineError)
      .mockResolvedValueOnce(testPipelineValidResult)
      .mockResolvedValueOnce(testPipelineValidResult)
      .mockResolvedValueOnce(testPipelineValidResult);

    let response;
    try {
      response = await relatedGraph.invoke(mockedRequestWithPipeline);
    } catch (e) {
      // noop
    }

    expect(response.results).toStrictEqual(relatedExpectedResults);

    // Check if the functions were called
    expect(handleRelated).toHaveBeenCalled();
    expect(handleErrors).toHaveBeenCalled();
    expect(handleReview).toHaveBeenCalled();
  });
});
