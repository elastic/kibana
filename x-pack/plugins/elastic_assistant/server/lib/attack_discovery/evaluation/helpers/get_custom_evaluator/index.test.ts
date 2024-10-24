/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptTemplate } from '@langchain/core/prompts';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import { loadEvaluator } from 'langchain/evaluation';

import { type GetCustomEvaluatorOptions, getCustomEvaluator } from '.';
import { getDefaultPromptTemplate } from './get_default_prompt_template';
import { getExampleAttackDiscoveriesWithReplacements } from './get_example_attack_discoveries_with_replacements';
import { getRunAttackDiscoveriesWithReplacements } from './get_run_attack_discoveries_with_replacements';
import { exampleWithReplacements } from '../../__mocks__/mock_examples';
import { runWithReplacements } from '../../__mocks__/mock_runs';

const mockLlm = jest.fn() as unknown as ActionsClientLlm;

jest.mock('langchain/evaluation', () => ({
  ...jest.requireActual('langchain/evaluation'),
  loadEvaluator: jest.fn().mockResolvedValue({
    evaluateStrings: jest.fn().mockResolvedValue({
      key: 'correctness',
      score: 0.9,
    }),
  }),
}));

const options: GetCustomEvaluatorOptions = {
  criteria: 'correctness',
  key: 'attack_discovery_correctness',
  llm: mockLlm,
  template: getDefaultPromptTemplate(),
};

describe('getCustomEvaluator', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an evaluator function', () => {
    const evaluator = getCustomEvaluator(options);

    expect(typeof evaluator).toBe('function');
  });

  it('calls loadEvaluator with the expected arguments', async () => {
    const evaluator = getCustomEvaluator(options);

    await evaluator(runWithReplacements, exampleWithReplacements);

    expect(loadEvaluator).toHaveBeenCalledWith('labeled_criteria', {
      criteria: options.criteria,
      chainOptions: {
        prompt: PromptTemplate.fromTemplate(options.template),
      },
      llm: mockLlm,
    });
  });

  it('calls evaluateStrings with the expected arguments', async () => {
    const mockEvaluateStrings = jest.fn().mockResolvedValue({
      key: 'correctness',
      score: 0.9,
    });

    (loadEvaluator as jest.Mock).mockResolvedValue({
      evaluateStrings: mockEvaluateStrings,
    });

    const evaluator = getCustomEvaluator(options);

    await evaluator(runWithReplacements, exampleWithReplacements);

    const prediction = getRunAttackDiscoveriesWithReplacements(runWithReplacements);
    const reference = getExampleAttackDiscoveriesWithReplacements(exampleWithReplacements);

    expect(mockEvaluateStrings).toHaveBeenCalledWith({
      input: '',
      prediction: JSON.stringify(prediction, null, 2),
      reference: JSON.stringify(reference, null, 2),
    });
  });

  it('returns the expected result', async () => {
    const evaluator = getCustomEvaluator(options);

    const result = await evaluator(runWithReplacements, exampleWithReplacements);

    expect(result).toEqual({ key: 'attack_discovery_correctness', score: 0.9 });
  });

  it('throws given an undefined example', async () => {
    const evaluator = getCustomEvaluator(options);

    await expect(async () => evaluator(runWithReplacements, undefined)).rejects.toThrow();
  });
});
