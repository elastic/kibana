/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset } from '@kbn/evals';
import type { CorpusProfile } from './corpora';
import type { SemanticLogExample } from './types';

/** Experiment families, which run different evaluators and so are not comparable to each other. */
export const FAMILIES = {
  retrieval: 'retrieval',
  agent: 'agent',
} as const;

export type Family = (typeof FAMILIES)[keyof typeof FAMILIES];

/**
 * Builds the dataset a family of arms is scored against: the questions and the corpus, with no arm
 * in it. The arm is the experiment, not the dataset.
 *
 * That split is load-bearing rather than cosmetic. Comparing two experiments pairs their scores on
 * `(dataset.id, example.id, evaluator.name, repetition_index)`, and the compare route declines
 * outright when two experiments share no `dataset.id`, so arms can only be compared to each other
 * when they share one dataset and unprefixed example ids. While each arm had its own dataset, the
 * arm comparison this suite exists for was the one comparison the UI and `evals compare` could not
 * produce.
 * https://github.com/elastic/kibana/blob/e4119fa64930/x-pack/platform/packages/shared/kbn-evals-common/impl/statistical_analysis.ts#L62
 *
 * Nothing arm-specific may go in here. Every arm upserts this same record by id, so an arm-specific
 * description, tag or example metadata would be last-writer-wins churn on a shared row.
 *
 * The corpus id and the family are part of the name, and `dataset.id` is a UUIDv5 of the name, so
 * two corpora and the two families keep separate evaluation histories.
 * https://github.com/elastic/kibana/blob/e4119fa64930/x-pack/platform/packages/shared/kbn-evals-common/impl/dataset_ids.ts#L24
 */
export const datasetFor = (
  corpus: CorpusProfile,
  family: Family
): EvaluationDataset<SemanticLogExample> => ({
  name: `semantic-log-search-${corpus.id}-${family}`,
  description: `${corpus.description} Scored by the ${family} arms.`,
  tags: ['observability', 'logs', 'semantic-search', corpus.id, family],
  maturity: 'cleaned',
  examples: corpus.queries.map((query) => ({
    id: query.id,
    input: { question: query.question, queryId: query.id },
    output: { query },
    metadata: { kind: query.kind },
  })),
});
