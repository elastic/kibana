/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { z, lazySchema } from '@kbn/zod/v4';
import type { EvaluationDataset } from '@kbn/evals';
import { DatasetTags } from '@kbn/evals-common';
import { wikiReplayExampleSchema, type WikiReplayExample } from './types';

const wikiReplayFileSchema = lazySchema(() =>
  z.object({
    dataset: z
      .string()
      .min('nightshift/'.length + 1)
      .max(200)
      .startsWith('nightshift/'),
    description: z.string().max(2_000).optional(),
    tags: DatasetTags.default([]),
    examples: z.array(wikiReplayExampleSchema).min(1).max(1_000),
  })
);

const assertDistinctCaseIds = (examples: WikiReplayExample[]) => {
  const caseIds = new Set<string>();
  for (const {
    metadata: { case_id: caseId },
  } of examples) {
    if (caseIds.has(caseId)) throw new Error(`Duplicate case_id: ${caseId}`);
    caseIds.add(caseId);
  }
};

/**
 * Loads the replay examples from `NIGHTSHIFT_WIKI_REPLAY_FILE`, falling back to the bundled
 * synthetic examples. Replays built from real investigation traces hold infrastructure details and
 * stay out of the repository; point the variable at a private file to run them.
 */
export const readWikiReplayDataset = (
  path = process.env.NIGHTSHIFT_WIKI_REPLAY_FILE ?? join(__dirname, 'synthetic.json')
): EvaluationDataset<WikiReplayExample> => {
  const file = wikiReplayFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  assertDistinctCaseIds(file.examples);
  return {
    name: file.dataset,
    description:
      file.description ?? 'Saved investigation rounds replayed through the Wiki optimizer.',
    tags: DatasetTags.parse([...new Set(['nightshift', 'wiki-optimize', ...file.tags])]),
    examples: file.examples,
  };
};
