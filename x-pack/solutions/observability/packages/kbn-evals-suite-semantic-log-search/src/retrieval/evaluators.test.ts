/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORPORA } from '../corpora';
import type { EvalQuery } from '../ground_truth';
import { countSanityEvaluator, createWeightedPrecisionEvaluator } from './evaluators';
import type { RetrievalEvaluator } from './evaluators';
import type { RetrievalTaskOutput, RetrievedPattern } from './types';

const corpus = CORPORA.sigevents_postgres_timeout;
const query = corpus.queries.find((candidate) => candidate.id === 'connection_failures')!;

const pattern = (message: string, count: number): RetrievedPattern => ({
  pattern: message,
  message,
  count,
});

const relevant = (index: number, count: number) =>
  pattern(corpus.messageClasses.networkConnectivityFailure[index], count);

const output = (overrides: Partial<RetrievalTaskOutput> = {}): RetrievalTaskOutput => ({
  patterns: [],
  totalCount: 0,
  warnings: [],
  latencyMs: 100,
  returnedBeforeCap: 0,
  ...overrides,
});

// The evaluators only read `output` and `expected`; the other two params exist to satisfy the
// shared `EvaluatorParams` shape.
const run = (
  evaluator: RetrievalEvaluator,
  taskOutput: RetrievalTaskOutput,
  expected?: EvalQuery
) =>
  evaluator.evaluate({
    input: { question: query.question, queryId: query.id },
    output: taskOutput,
    expected: expected ? { query: expected } : undefined,
    metadata: { kind: query.kind },
  });

describe('countSanityEvaluator', () => {
  it('scores 0 when the counts are plausible against the window', async () => {
    const taskOutput = output({ patterns: [relevant(0, 400), relevant(1, 300)], totalCount: 700 });

    await expect(run(countSanityEvaluator(1000), taskOutput)).resolves.toMatchObject({ score: 0 });
  });

  it('flags counts that exceed the documents in the window', async () => {
    const taskOutput = output({ patterns: [relevant(0, 5000)], totalCount: 5000 });

    const result = await run(countSanityEvaluator(1000), taskOutput);

    expect(result.score).toBe(1);
    expect(result.explanation).toMatch(/lifetime counters/);
  });

  it('flags counts that are implausibly small against the documents the query matched', async () => {
    // 70 of a matched 10,000 is the shape of raw sampled `doc_count` reaching the evaluator.
    const taskOutput = output({ patterns: [relevant(0, 40), relevant(1, 30)], totalCount: 10_000 });

    const result = await run(countSanityEvaluator(10_000), taskOutput);

    expect(result.score).toBe(1);
    expect(result.explanation).toMatch(/raw sampled doc_count/);
  });

  // Regression: the low-side guard was briefly changed to compare against the corpus size instead
  // of `totalCount`. That reports every narrow question as broken, because a narrow filter
  // legitimately matches a small slice of the corpus. Measured against a 2,611-document corpus,
  // `message: hikaripool` matched 12 documents whose counts summed to exactly 12 (correct and
  // complete), and `message: econnrefused` 100 of 100, yet a corpus-relative guard flagged both.
  it('does not flag a narrow query whose counts fully account for the matched documents', async () => {
    const narrow = output({ patterns: [relevant(0, 12)], totalCount: 12 });

    const result = await run(countSanityEvaluator(2611), narrow);

    expect(result.score).toBe(0);
  });

  it('does not flag an empty result list', async () => {
    await expect(run(countSanityEvaluator(10_000), output())).resolves.toMatchObject({ score: 0 });
  });
});

describe('createWeightedPrecisionEvaluator', () => {
  const fullList = (count: number) =>
    output({
      patterns: Array.from({ length: corpus.maxPatterns }, () => relevant(0, count)),
      totalCount: count * corpus.maxPatterns,
    });

  it('declines to score a full result list on a sampled scale', async () => {
    const evaluator = createWeightedPrecisionEvaluator(corpus);
    // 20 patterns of 1 against a matched 1,000,000: the counts cannot be population scale.
    const sampled = { ...fullList(1), totalCount: 1_000_000 };

    const result = await run(evaluator, sampled, query);

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
    expect(result.explanation).toMatch(/sampled scale/);
  });

  it('scores normally when the counts account for the matched documents', async () => {
    const evaluator = createWeightedPrecisionEvaluator(corpus);

    const result = await run(evaluator, fullList(100), query);

    expect(result.score).toBe(1);
  });

  // The semantic tool derives `totalCount` as the sum of the counts it returns, so this guard
  // reduces to `sum < sum * ratio` and is inert on that arm. Detecting un-normalised sampled
  // counts there needs the probe total, which the service does not report.
  it('is inert when totalCount is derived from the returned patterns', async () => {
    const evaluator = createWeightedPrecisionEvaluator(corpus);

    const result = await run(evaluator, fullList(1), query);

    expect(result.score).toBe(1);
  });

  it('is unavailable when the example carries no ground truth', async () => {
    const evaluator = createWeightedPrecisionEvaluator(corpus);

    const result = await run(evaluator, fullList(100));

    expect(result.score).toBeNull();
    expect(result.explanation).toMatch(/No ground truth/);
  });
});
