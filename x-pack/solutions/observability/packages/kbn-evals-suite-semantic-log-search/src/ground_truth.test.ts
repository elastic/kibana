/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allLabels, CORPORA, type CorpusProfile } from './corpora';
import { gradeOf, isTrap, matchedLabels, relevantLabels } from './ground_truth';

/**
 * Validates invariants that every corpus profile must satisfy. A new corpus
 * inherits these tests automatically when registered in `CORPORA`.
 */
const assertProfileIsConsistent = (corpus: CorpusProfile) => {
  const labels = allLabels(corpus);
  const classIds = Object.keys(corpus.messageClasses);

  describe('labels', () => {
    it('has no label that is a substring of another label', () => {
      // Matching is by substring, so an overlapping pair would make a single
      // message carry two labels and corrupt both the grade and the recall
      // denominator.
      const overlaps = labels.flatMap((label) =>
        labels
          .filter((other) => other !== label && other.toLowerCase().includes(label.toLowerCase()))
          .map((other) => `"${label}" is contained in "${other}"`)
      );

      expect(overlaps).toEqual([]);
    });

    it('assigns every label to exactly one class', () => {
      for (const label of labels) {
        const owningClasses = classIds.filter((classId) =>
          (corpus.messageClasses[classId] as readonly string[]).includes(label)
        );
        expect(owningClasses).toHaveLength(1);
      }
    });
  });

  describe('queries', () => {
    it.each(corpus.queries.map((query) => [query.id, query] as const))(
      '%s never grades a trap as relevant',
      (_id, query) => {
        // A message cannot be both an answer and a trap: precision and the trap
        // count have to partition the top K.
        for (const trap of query.traps) {
          expect(gradeOf(trap, query)).toBe(0);
        }
      }
    );

    it.each(corpus.queries.map((query) => [query.id, query] as const))(
      '%s grades every one of its own relevant labels above zero',
      (_id, query) => {
        for (const label of relevantLabels(query, 1)) {
          expect(gradeOf(label, query)).toBeGreaterThan(0);
        }
      }
    );

    it('keeps unique query ids', () => {
      const ids = corpus.queries.map((query) => query.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
};

/**
 * Run invariant tests over all registered corpora. A new corpus is automatically
 * covered when added to `CORPORA`.
 */
describe.each(Object.values(CORPORA))('corpus profile: $id', (corpus) => {
  assertProfileIsConsistent(corpus);
});

/**
 * Tests for the pure predicates in ground_truth.ts, using the default corpus
 * as a fixture.
 */
describe('ground truth predicates', () => {
  const corpus = CORPORA.sigevents_postgres_timeout;
  const connectionFailures = corpus.queries.find((query) => query.id === 'connection_failures')!;
  const databaseSlow = corpus.queries.find((query) => query.id === 'database_slow')!;

  describe('gradeOf', () => {
    it('matches case-insensitively', () => {
      expect(gradeOf('WARN UNABLE TO REACH KAFKA BROKER after 3 retries', connectionFailures)).toBe(
        2
      );
    });

    it('grades a warning below a failure', () => {
      expect(gradeOf('Pool nearing capacity: active=18', connectionFailures)).toBe(1);
    });

    it('grades an unlabelled message zero', () => {
      expect(gradeOf('Claim intake completed', connectionFailures)).toBe(0);
    });

    it('takes the highest grade when a message carries labels of several grades', () => {
      const message = 'Pool nearing capacity: active=18; Connection pool exhausted';
      expect(gradeOf(message, connectionFailures)).toBe(2);
    });
  });

  describe('isTrap', () => {
    it('flags a healthy line for a failure question', () => {
      expect(isTrap('LOG:  connection received: host=10.0.0.4', connectionFailures)).toBe(true);
    });

    it('flags a connectivity failure for the slowness question', () => {
      expect(isTrap('outbound connection refused', databaseSlow)).toBe(true);
      expect(gradeOf('outbound connection refused', databaseSlow)).toBe(0);
    });
  });

  describe('relevantLabels', () => {
    it('includes warnings at threshold 1 and excludes them at threshold 2', () => {
      expect(relevantLabels(connectionFailures, 1)).toHaveLength(
        corpus.messageClasses.connectionFailure.length +
          corpus.messageClasses.connectionWarning.length
      );
      expect(relevantLabels(connectionFailures, 2)).toHaveLength(
        corpus.messageClasses.connectionFailure.length
      );
    });
  });

  describe('matchedLabels', () => {
    it('returns only the labels the message carries', () => {
      expect(
        matchedLabels('ERROR unable to reach Kafka broker after 3 retries', [
          ...corpus.messageClasses.connectionFailure,
        ])
      ).toEqual(['unable to reach Kafka broker']);
    });
  });
});
