/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from '@kbn/zod/v4';
import type { EvaluationDataset, EvaluationDatasetWithId, EvalsClient } from '@kbn/evals';
import { DatasetTags } from '@kbn/evals-common';
import { investigationExampleSchema, type InvestigationExample } from './types';

const investigationFileSchema = z.object({
  dataset: z
    .string()
    .min('nightshift/'.length + 1)
    .max(200)
    .startsWith('nightshift/'),
  description: z.string().max(2_000).optional(),
  tags: DatasetTags.default([]),
  examples: z.array(investigationExampleSchema).min(1).max(1_000),
});

const assertDistinctCaseIds = (examples: InvestigationExample[]) => {
  const caseIds = new Set<string>();
  for (const {
    metadata: { case_id: caseId },
  } of examples) {
    if (caseIds.has(caseId)) throw new Error(`Duplicate case_id: ${caseId}`);
    caseIds.add(caseId);
  }
};

/** Loads a stored dataset by ID or falls back to a file of investigation questions. */
export const loadInvestigationDataset = async (
  client: Pick<EvalsClient, 'getDatasetById'>,
  {
    datasetId = process.env.NIGHTSHIFT_DATASET_ID,
    examplesFile = process.env.NIGHTSHIFT_EXAMPLES_FILE,
  }: { datasetId?: string; examplesFile?: string } = {}
): Promise<
  EvaluationDataset<InvestigationExample> | EvaluationDatasetWithId<InvestigationExample>
> => {
  if (datasetId && examplesFile) {
    throw new Error('Choose either NIGHTSHIFT_DATASET_ID or NIGHTSHIFT_EXAMPLES_FILE, not both');
  }
  if (!datasetId) return readInvestigationDataset(examplesFile);

  const dataset = await client.getDatasetById(datasetId);
  if (!dataset) throw new Error(`Investigation dataset not found: ${datasetId}`);
  const examples = z
    .array(investigationExampleSchema.extend({ id: z.string().min(1) }))
    .min(1)
    .max(1_000)
    .parse(dataset.examples);
  assertDistinctCaseIds(examples);
  return { ...dataset, examples };
};

/** Loads a file dataset for ungraded investigations, preserving optional labels and metadata. */
export const readInvestigationDataset = (
  path = process.env.NIGHTSHIFT_EXAMPLES_FILE ?? join(__dirname, 'synthetic.json')
): EvaluationDataset<InvestigationExample> => {
  const file = investigationFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  assertDistinctCaseIds(file.examples);
  return {
    name: file.dataset,
    description: file.description ?? 'Ungraded investigations with complete agent traces.',
    tags: DatasetTags.parse([...new Set(['nightshift', 'ungraded', ...file.tags])]),
    examples: file.examples,
  };
};
