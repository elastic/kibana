/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORPORA } from '../corpora';
import type { RetrievedPattern } from './types';
import {
  distinctRelevantMessagesAtK,
  ndcgAtK,
  precisionAtK,
  rPrecision,
  recallOfLabels,
  reciprocalRank,
  relevantAtK,
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

describe('relevantAtK', () => {
  it('returns the number of relevant patterns in the top K', () => {
    const results = [relevant(0), trap(0), relevant(1)];
    expect(relevantAtK(results, connectionFailures, 3, 2)).toBe(2);
  });

  it('counts only within the top K cutoff', () => {
    const results = [trap(0), trap(1), relevant(0)];
    expect(relevantAtK(results, connectionFailures, 2, 2)).toBe(0);
    expect(relevantAtK(results, connectionFailures, 3, 2)).toBe(1);
  });

  it('returns 0 for a non-positive K', () => {
    expect(relevantAtK([relevant(0)], connectionFailures, 0, 2)).toBe(0);
  });

  it('is consistent with precisionAtK (hits / k)', () => {
    const results = [relevant(0), relevant(1), trap(0)];
    const k = 3;
    const threshold = 2;
    expect(precisionAtK(results, connectionFailures, k, threshold)).toBeCloseTo(
      relevantAtK(results, connectionFailures, k, threshold) / k
    );
  });
});

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

describe('rPrecision', () => {
  // connectionFailures has 8 grade-2 labels (3 postgres + 3 network + 2 kafka),
  // so R = 8. A single relevant result in position 1 → 1/8.
  it('divides by the number of relevant labels, not K', () => {
    const results = [relevant(0)];
    const r = corpus.messageClasses.postgresPoolFailure.length +
      corpus.messageClasses.networkConnectivityFailure.length +
      corpus.messageClasses.kafkaBrokerFailure.length;
    expect(rPrecision(results, connectionFailures, 2)).toBeCloseTo(1 / r);
  });

  it('reaches 1.0 for a literal query with one correct answer', () => {
    // literal_econnrefused has 1 grade-2 label: 'outbound connection refused'
    const literalQuery = corpus.queries.find((q) => q.id === 'literal_econnrefused')!;
    const correct = pattern(corpus.messageClasses.networkConnectivityFailure[0]); // 'outbound connection refused'
    expect(rPrecision([correct], literalQuery, 2)).toBe(1.0);
  });

  it('returns null when the query has no relevant labels', () => {
    // Construct a query with no graded entries
    const emptyQuery = { ...connectionFailures, graded: [] };
    expect(rPrecision([relevant(0)], emptyQuery, 2)).toBeNull();
  });
});

describe('ndcgAtK', () => {
  it('returns 1.0 when the ideal order is achieved', () => {
    // All grade-2 labels for connection_failures at the top
    const allGrade2 = [
      ...corpus.messageClasses.postgresPoolFailure,
      ...corpus.messageClasses.networkConnectivityFailure,
      ...corpus.messageClasses.kafkaBrokerFailure,
    ].map((msg) => pattern(msg));
    // With all grade-2 at the top, nDCG should be 1.0
    const score = ndcgAtK(allGrade2, connectionFailures, allGrade2.length, 2);
    expect(score).toBeCloseTo(1.0);
  });

  it('scores lower when relevant results are buried', () => {
    // Relevant result at position 3 (0-indexed 2) vs position 1 (0-indexed 0)
    const buryLast = [trap(0), trap(1), relevant(0)];
    const ideal = [relevant(0), trap(0), trap(1)];
    const buried = ndcgAtK(buryLast, connectionFailures, 3, 2);
    const idealScore = ndcgAtK(ideal, connectionFailures, 3, 2);
    expect(buried).not.toBeNull();
    expect(idealScore).not.toBeNull();
    expect(buried!).toBeLessThan(idealScore!);
  });

  it('returns null when the query has no relevant labels', () => {
    const emptyQuery = { ...connectionFailures, graded: [] };
    expect(ndcgAtK([relevant(0)], emptyQuery, 5, 2)).toBeNull();
  });
});

describe('reciprocalRank', () => {
  it('returns 1 when the first result is relevant', () => {
    expect(reciprocalRank([relevant(0)], connectionFailures, 2)).toBe(1);
  });

  it('returns 1/2 when the second result is the first relevant', () => {
    expect(reciprocalRank([trap(0), relevant(0)], connectionFailures, 2)).toBeCloseTo(0.5);
  });

  it('returns 0 when no relevant result is found', () => {
    expect(reciprocalRank([trap(0), trap(1)], connectionFailures, 2)).toBe(0);
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
