/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset } from '@kbn/evals';
import type { CorpusProfile } from './corpora';
import type { Arm, SemanticLogExample } from './types';

/**
 * Builds the dataset for one arm. Every arm answers the same questions against
 * the same corpus, so the only difference between runs is the arm itself.
 *
 * The corpus id is embedded in the dataset name so that results from different
 * corpora do not collide in the same evaluation history.
 */
export const datasetForArm = (
  arm: Arm,
  corpus: CorpusProfile
): EvaluationDataset<SemanticLogExample> => ({
  name: `semantic-log-search-${corpus.id}-${arm}`,
  description: `${corpus.description}, answered by the "${arm}" arm.`,
  tags: ['observability', 'logs', 'semantic-search', corpus.id, arm],
  maturity: 'cleaned',
  examples: corpus.queries.map((query) => ({
    id: `${arm}-${query.id}`,
    input: { question: query.question, queryId: query.id },
    output: { query },
    metadata: { kind: query.kind, arm },
  })),
});
