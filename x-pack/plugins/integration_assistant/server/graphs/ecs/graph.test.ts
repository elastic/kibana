/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { getEcsGraph } from './graph';
import {
  ecsInitialMappingMockedResponse,
  ecsDuplicateMockedResponse,
  ecsInvalidMappingMockedResponse,
  ecsMissingKeysMockedResponse,
  ecsMappingExpectedResults,
} from '../../../__jest__/fixtures/ecs_mapping';
import { mockedRequest } from '../../../__jest__/fixtures';
import { handleEcsMapping } from './mapping';
import { handleDuplicates } from './duplicates';
import { handleMissingKeys } from './missing';
import { handleInvalidEcs } from './invalid';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';

const model = new FakeLLM({
  response: "I'll callback later.",
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

jest.mock('./mapping');
jest.mock('./duplicates');
jest.mock('./missing');
jest.mock('./invalid');

describe('EcsGraph', () => {
  describe('Compiling and Running', () => {
    beforeEach(() => {
      // Mocked responses for each node that requires an LLM API call/response.
      const mockInvokeMapping = jest.fn().mockResolvedValue(ecsInitialMappingMockedResponse);
      const mockInvokeDuplicates = jest.fn().mockResolvedValue(ecsDuplicateMockedResponse);
      const mockInvokeMissingKeys = jest.fn().mockResolvedValue(ecsMissingKeysMockedResponse);
      const mockInvokeInvalidEcs = jest.fn().mockResolvedValue(ecsInvalidMappingMockedResponse);

      // Returns the initial response, with one duplicate field, to trigger the next step.
      (handleEcsMapping as jest.Mock).mockImplementation(async () => ({
        currentMapping: await mockInvokeMapping(),
        lastExecutedChain: 'ecsMapping',
      }));
      // Returns the response with the duplicate field removed, but missing one to trigger the next step.
      (handleDuplicates as jest.Mock).mockImplementation(async () => ({
        currentMapping: await mockInvokeDuplicates(),
        lastExecutedChain: 'duplicateFields',
      }));

      // Returns the response with the missing field added, but invalid ECS field to trigger the next step.
      (handleMissingKeys as jest.Mock).mockImplementation(async () => ({
        currentMapping: await mockInvokeMissingKeys(),
        lastExecutedChain: 'missingKeys',
      }));

      // Returns the response with the invalid ECS field fixed, which finishes the chain.
      (handleInvalidEcs as jest.Mock).mockImplementation(async () => ({
        currentMapping: await mockInvokeInvalidEcs(),
        lastExecutedChain: 'invalidEcs',
      }));
    });
    it('Ensures that the graph compiles', async () => {
      // When getEcsGraph runs, langgraph compiles the graph it will error if the graph has any issues.
      // Common issues for example detecting a node has no next step, or there is a infinite loop between them.
      try {
        await getEcsGraph({ model });
      } catch (error) {
        throw Error(`getEcsGraph threw an error: ${error}`);
      }
    });
    it('Runs the whole graph, with mocked outputs from the LLM.', async () => {
      // The mocked outputs are specifically crafted to trigger ALL different conditions, allowing us to test the whole graph.
      // This is why we have all the expects ensuring each function was called.
      const ecsGraph = await getEcsGraph({ model });
      let response;
      try {
        response = await ecsGraph.invoke(mockedRequest);
      } catch (error) {
        throw Error(`getEcsGraph threw an error: ${error}`);
      }

      expect(response.results).toStrictEqual(ecsMappingExpectedResults);

      // Check if the functions were called
      expect(handleEcsMapping).toHaveBeenCalled();
      expect(handleDuplicates).toHaveBeenCalled();
      expect(handleMissingKeys).toHaveBeenCalled();
      expect(handleInvalidEcs).toHaveBeenCalled();
    });
  });
});
