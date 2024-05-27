/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeListLLM } from 'langchain/llms/fake';
import { getEcsGraph } from './graph';
import { getModel } from '../../providers/bedrock';
import { ecsMappingGraphRequest } from '../../../__jest__/fixtures';
import { handleEcsMapping } from './mapping';
import { handleDuplicates } from './duplicates';
import { handleMissingKeys } from './missing';
import { handleInvalidEcs } from './invalid';
import { handleValidateMappings } from './validate';

const llm = new FakeListLLM({
  responses: ["I'll callback later.", "You 'console' them!"],
});

jest.mock('./mapping');
jest.mock('./duplicates');
jest.mock('./missing');
jest.mock('./invalid');
jest.mock('./validate');
jest.mock('../../providers/bedrock', () => ({
  getModel: jest.fn().mockReturnValue(llm),
}));

describe('runEcsGraph', () => {
  beforeEach(() => {
    // Mocked responses for each node that requires an LLM API call/response.
    const mockInvokeMapping = jest.fn().mockResolvedValue('mocked mapping result');
    const mockInvokeDuplicates = jest.fn().mockResolvedValue('mocked duplicates result');
    const mockInvokeMissingKeys = jest.fn().mockResolvedValue('mocked missing keys result');
    const mockInvokeInvalidEcs = jest.fn().mockResolvedValue('mocked invalid ecs result');
    const mockInvokeValidateMappings = jest
      .fn()
      .mockResolvedValue('mocked validate mappings result');

    // Mock the internal implementations of the functions
    (handleEcsMapping as jest.Mock).mockImplementation(async () => ({
      currentMapping: await mockInvokeMapping(),
      lastExecutedChain: 'ecsMapping',
    }));

    (handleDuplicates as jest.Mock).mockImplementation(async () => ({
      currentMapping: await mockInvokeDuplicates(),
      lastExecutedChain: 'duplicateFields',
    }));

    (handleMissingKeys as jest.Mock).mockImplementation(async () => ({
      currentMapping: await mockInvokeMissingKeys(),
      lastExecutedChain: 'missingKeys',
    }));

    (handleInvalidEcs as jest.Mock).mockImplementation(async () => ({
      currentMapping: await mockInvokeInvalidEcs(),
      lastExecutedChain: 'invalidEcs',
    }));

    (handleValidateMappings as jest.Mock).mockImplementation(async () => ({
      currentMapping: await mockInvokeValidateMappings(),
      lastExecutedChain: 'validateMappings',
    }));
  });
  it('Ensures that the graph compiles', async () => {
    // When a defined langgraph runs graph.compile() it will error if the graph has any issues.
    // Common issues for example detecting a node has no next step, or there is a infinite loop between them.
    try {
      await getEcsGraph();
    } catch (error) {
      fail(`getEcsGraph threw an error: ${error}`);
    }
  });
  it('Runs the whole graph, with mocked outputs from the LLM.', async () => {
    // The mocked outputs are specifically crafted to trigger ALL different conditions, allowing us to test the whole graph.
    // This is why we have all the expects ensuring each function was called.

    const ecsGraph = await getEcsGraph();
    const results = await ecsGraph.invoke(ecsMappingGraphRequest);
    expect(results).toBe('mocked graph');

    // Check if the functions were called
    expect(handleEcsMapping).toHaveBeenCalled();
    expect(handleDuplicates).toHaveBeenCalled();
    expect(handleMissingKeys).toHaveBeenCalled();
    expect(handleInvalidEcs).toHaveBeenCalled();
    expect(handleValidateMappings).toHaveBeenCalled();
    expects(getModel).toHaveBeenCalled();
  });
});
