/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORPORA } from './corpora';
import type { RetrievedPattern } from './metrics';
import {
  distinctRelevantMessagesAtK,
  precisionAtK,
  recallOfLabels,
  topRelevanceScore,
  trapsAtK,
  weightedPrecisionAtK,
} from './metrics';

/** Use the default corpus as the fixture for metric tests. */
const corpus = CORPORA.sigevents_postgres_timeout;
const connectionFailures = corpus.queries.find((query) => query.id === 'connection_failures')!;

const pattern = (message: string, count = 1): RetrievedPattern => ({
  pattern: message,
  message,
  count,
});

// Use networkConnectivityFailure as the "relevant" fixture — it contains generic failure labels
// that cover the connection_failures query at grade 2, independent of Postgres/Kafka specifics.
const relevant = (index: number, count = 1) =>
  pattern(corpus.messageClasses.networkConnectivityFailure[index], count);

const trap = (index: number, count = 1) =>
  pattern(corpus.messageClasses.connectionHealthy[index], count);

describe('precisionAtK', () => {
  it('divides by K even when fewer results are returned', () => {
    // Returning three relevant results out of a requested ten is 0.3, not 1.0.
    const results = [relevant(0), relevant(1), relevant(2)];
    expect(precisionAtK(results, connectionFailures, 10, 2)).toBeCloseTo(0.3);
  });

  it('counts only the top K', () => {
    const results = [trap(0), trap(1), relevant(0)];
    expect(precisionAtK(results, connectionFailures, 2, 2)).toBe(0);
  });

  it('excludes warnings at threshold 2 and includes them at threshold 1', () => {
    const results = [pattern(corpus.messageClasses.connectionPoolWarning[1])];
    expect(precisionAtK(results, connectionFailures, 1, 2)).toBe(0);
    expect(precisionAtK(results, connectionFailures, 1, 1)).toBe(1);
  });

  it('returns 0 for a non-positive K', () => {
    expect(precisionAtK([relevant(0)], connectionFailures, 0, 2)).toBe(0);
  });
});

describe('weightedPrecisionAtK', () => {
  it('weights each result by the documents it covers', () => {
    // One relevant pattern covering 900 documents against one trap covering 100:
    // plain precision is 0.5, weighted precision is 0.9.
    const results = [relevant(0, 900), trap(0, 100)];

    expect(precisionAtK(results, connectionFailures, 2, 2)).toBe(0.5);
    expect(weightedPrecisionAtK(results, connectionFailures, 2, 2)).toBeCloseTo(0.9);
  });

  it('diverges from plain precision when the relevant results are marginal', () => {
    const results = [relevant(0, 50), trap(0, 5000)];
    expect(weightedPrecisionAtK(results, connectionFailures, 2, 2)).toBeCloseTo(0.0099, 3);
  });

  it('returns null when the top K covers no documents', () => {
    expect(weightedPrecisionAtK([relevant(0, 0)], connectionFailures, 5, 2)).toBeNull();
  });
});

describe('recallOfLabels', () => {
  it('measures distinct labels found anywhere in the results', () => {
    const results = [relevant(0), relevant(1)];
    // Recall denominator = all grade-2 labels for connection_failures
    const expectedLabels =
      corpus.messageClasses.postgresPoolFailure.length +
      corpus.messageClasses.networkConnectivityFailure.length +
      corpus.messageClasses.kafkaBrokerFailure.length;

    expect(recallOfLabels(results, connectionFailures, 2)).toBeCloseTo(2 / expectedLabels);
  });

  it('does not count the same label twice', () => {
    const results = [relevant(0), relevant(0), relevant(0)];
    const expectedLabels =
      corpus.messageClasses.postgresPoolFailure.length +
      corpus.messageClasses.networkConnectivityFailure.length +
      corpus.messageClasses.kafkaBrokerFailure.length;

    expect(recallOfLabels(results, connectionFailures, 2)).toBeCloseTo(1 / expectedLabels);
  });
});

describe('trapsAtK', () => {
  it('counts lexical traps inside the top K only', () => {
    const results = [trap(0), relevant(0), trap(1)];
    expect(trapsAtK(results, connectionFailures, 2)).toBe(1);
    expect(trapsAtK(results, connectionFailures, 3)).toBe(2);
  });

  it('does not count a relevant result as a trap', () => {
    expect(trapsAtK([relevant(0)], connectionFailures, 10)).toBe(0);
  });
});

describe('distinctRelevantMessagesAtK', () => {
  it('collapses repeats of the same message', () => {
    const results = [relevant(0), relevant(0), relevant(1)];
    expect(distinctRelevantMessagesAtK(results, connectionFailures, 20, 2)).toBe(2);
  });
});

describe('topRelevanceScore', () => {
  it('returns the score from the first pattern when present', () => {
    const results: RetrievedPattern[] = [
      { pattern: 'a', message: 'a', count: 10, relevanceScore: 3.5 },
      { pattern: 'b', message: 'b', count: 5, relevanceScore: 2.1 },
    ];
    expect(topRelevanceScore(results)).toBe(3.5);
  });

  it('returns null when patterns have no relevanceScore', () => {
    const results: RetrievedPattern[] = [
      { pattern: 'a', message: 'a', count: 10 },
      { pattern: 'b', message: 'b', count: 5 },
    ];
    expect(topRelevanceScore(results)).toBeNull();
  });

  it('returns null when there are no patterns', () => {
    expect(topRelevanceScore([])).toBeNull();
  });

  it('handles negative scores', () => {
    const results: RetrievedPattern[] = [
      { pattern: 'a', message: 'a', count: 10, relevanceScore: -2.5 },
    ];
    expect(topRelevanceScore(results)).toBe(-2.5);
  });
});
