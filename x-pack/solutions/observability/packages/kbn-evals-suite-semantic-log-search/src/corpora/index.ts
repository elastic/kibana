/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sigeventsFraudCheckRedisHerring } from './fraud_check_redis_herring';
import { sigeventsPostgresTimeout } from './sigevents_postgres_timeout';
import { sigeventsPostgresTimeoutScale } from './sigevents_postgres_timeout_scale';
import type { CorpusProfile } from './types';

export type { CorpusProfile } from './types';
export { allLabels } from './types';
export { resolveCorpusWindow } from './window';

/** All registered corpora, keyed by id. Registering one here subjects it to the invariant tests. */
export const CORPORA: Readonly<Record<string, CorpusProfile>> = {
  [sigeventsPostgresTimeout.id]: sigeventsPostgresTimeout,
  [sigeventsPostgresTimeoutScale.id]: sigeventsPostgresTimeoutScale,
  [sigeventsFraudCheckRedisHerring.id]: sigeventsFraudCheckRedisHerring,
};

const DEFAULT_CORPUS_ID = sigeventsPostgresTimeout.id;

/**
 * Resolves a corpus by id, falling back to `SEMANTIC_LOG_CORPUS` and then to the default.
 * Throws with the valid ids rather than running against an unknown corpus, which would produce
 * scores that look real and mean nothing.
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
