/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectedCategoryCoverageEvaluator } from './expected_category_coverage';

describe('expected_category_coverage evaluator', () => {
  it('returns null when no expected categories specified', async () => {
    const result = await expectedCategoryCoverageEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        { esql: 'FROM logs | WHERE true', title: 'A', category: 'error', severity_score: 50 },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeNull();
  });

  it('scores full credit when all expected categories covered', async () => {
    const result = await expectedCategoryCoverageEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        { esql: 'FROM logs | WHERE true', title: 'A', category: 'error', severity_score: 50 },
        { esql: 'FROM logs | WHERE true', title: 'B', category: 'operational', severity_score: 50 },
      ],
      expected: { expected_categories: ['error', 'operational'] },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('penalises missing categories', async () => {
    const result = await expectedCategoryCoverageEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        { esql: 'FROM logs | WHERE true', title: 'A', category: 'error', severity_score: 50 },
      ],
      expected: { expected_categories: ['error', 'operational'] },
      metadata: null,
    });

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('operational');
  });
});
