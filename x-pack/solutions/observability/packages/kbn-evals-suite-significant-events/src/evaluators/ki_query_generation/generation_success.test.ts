/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generationSuccessEvaluator } from './generation_success';

const evaluate = (output: unknown) =>
  generationSuccessEvaluator.evaluate({
    input: {},
    output: output as Parameters<typeof generationSuccessEvaluator.evaluate>[0]['output'],
    expected: {},
    metadata: null,
  });

const query = (esql: string) => ({
  esql,
  title: 'Query',
  category: 'error' as const,
  severity_score: 50,
});

describe('generation_success evaluator', () => {
  it('scores 1 when the run produced accepted queries', async () => {
    const result = await evaluate({ queries: [query('FROM logs | WHERE a == 1')] });

    expect(result.score).toBe(1);
    expect((result.metadata as Record<string, unknown>).acceptedQueryCount).toBe(1);
  });

  it('scores 0 and reports no attempts when add_queries was never called', async () => {
    const result = await evaluate({ queries: [], query_attempts: [] });

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('no attempts');
    expect((result.metadata as Record<string, unknown>).attemptedNothing).toBe(true);
  });

  it('separates "tried and all rejected" from "never tried"', async () => {
    const result = await evaluate({
      queries: [],
      query_attempts: [
        { title: 'a', esql: 'FROM logs', status: 'Failed to add' as const },
        { title: 'b', esql: 'FROM logs', status: 'Failed to add' as const },
      ],
    });

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('all 2 attempts were rejected');
    expect((result.metadata as Record<string, unknown>).attemptedNothing).toBe(false);
  });

  it('scores 1 on a bare query array output', async () => {
    const result = await evaluate([query('FROM logs | WHERE a == 1')]);

    expect(result.score).toBe(1);
  });
});
