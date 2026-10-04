/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allLabels, CORPORA, type CorpusProfile } from './corpora';
import { gradeOf, isTrap, matchedLabels, relevantLabels } from './ground_truth';

/** Invariants every corpus profile has to satisfy, whatever data it points at. */
const assertProfileIsConsistent = (corpus: CorpusProfile) => {
  const labels = allLabels(corpus);
  const classIds = Object.keys(corpus.messageClasses);

  describe('labels', () => {
    it('has no label that is a substring of another label', () => {
      // Matching is by substring, so an overlapping pair makes one message carry two labels,
      // which corrupts both its grade and the recall denominator.
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

  describe('corpus constants', () => {
    it('satisfies k <= maxPatterns <= 20', () => {
      // 20 is the get_logs_semantic tool's schema ceiling. A profile with maxPatterns > 20
      // is rejected at runtime with no compile-time signal.
      expect(corpus.k).toBeLessThanOrEqual(corpus.maxPatterns);
      expect(corpus.maxPatterns).toBeLessThanOrEqual(20);
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

// Driven off `CORPORA`, so registering a corpus is what subjects it to these tests; there is no
// second place to remember to add it.
describe.each(Object.values(CORPORA))('corpus profile: $id', (corpus) => {
  assertProfileIsConsistent(corpus);
});

// Uses the default corpus as a fixture rather than an invented one, so the predicates are
// exercised against labels that really occur together.
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
      expect(
        gradeOf('[WARN] HikariPool: connection pool at 90% capacity', connectionFailures)
      ).toBe(1);
    });

    it('grades an unlabelled message zero', () => {
      expect(gradeOf('Claim intake completed', connectionFailures)).toBe(0);
    });

    it('takes the highest grade when a message carries labels of several grades', () => {
      const message = 'HikariPool: connection pool at 90% capacity; Connection pool exhausted';
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
      const grade2Count =
        corpus.messageClasses.postgresPoolFailure.length +
        corpus.messageClasses.networkConnectivityFailure.length +
        corpus.messageClasses.kafkaBrokerFailure.length;
      expect(relevantLabels(connectionFailures, 1)).toHaveLength(
        grade2Count + corpus.messageClasses.connectionPoolWarning.length
      );
      expect(relevantLabels(connectionFailures, 2)).toHaveLength(grade2Count);
    });
  });

  describe('matchedLabels', () => {
    it('returns only the labels the message carries', () => {
      expect(
        matchedLabels('ERROR unable to reach Kafka broker after 3 retries', [
          ...corpus.messageClasses.kafkaBrokerFailure,
        ])
      ).toEqual(['unable to reach Kafka broker']);
    });
  });
});
