/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sigeventsFraudCheckRedisHerring } from './fraud_check_redis_herring';
import { sigeventsPostgresTimeout } from './sigevents_postgres_timeout';
import type { CorpusProfile } from './types';

export type { CorpusProfile } from './types';
export { allLabels } from './types';

/**
 * All registered corpora, keyed by id. Add new profiles here and they will
 * automatically inherit the invariant tests in `ground_truth.test.ts`.
 */
export const CORPORA: Readonly<Record<string, CorpusProfile>> = {
  [sigeventsPostgresTimeout.id]: sigeventsPostgresTimeout,
  [sigeventsFraudCheckRedisHerring.id]: sigeventsFraudCheckRedisHerring,
};

const DEFAULT_CORPUS_ID = sigeventsPostgresTimeout.id;

/**
 * Resolves a corpus by id, defaulting to `process.env.SEMANTIC_LOG_CORPUS` or
 * the built-in default when not provided.
 *
 * Fails with the list of valid ids instead of returning undefined or running
 * against an unknown corpus.
 */
export const resolveCorpus = (
  id: string | undefined = process.env.SEMANTIC_LOG_CORPUS
): CorpusProfile => {
  const corpusId = id ?? DEFAULT_CORPUS_ID;
  const corpus = CORPORA[corpusId];

  if (!corpus) {
    const validIds = Object.keys(CORPORA).join(', ');
    throw new Error(
      `Unknown corpus "${corpusId}". Valid corpus ids are: ${validIds}. ` +
        `Set SEMANTIC_LOG_CORPUS to one of these or omit it to use the default (${DEFAULT_CORPUS_ID}).`
    );
  }

  return corpus;
};
