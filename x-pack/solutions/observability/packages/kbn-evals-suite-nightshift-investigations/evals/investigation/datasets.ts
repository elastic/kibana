/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from '@kbn/zod/v4';
import type { EvaluationDataset, EvalsClient } from '@kbn/evals';
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

/**
 * The stored dataset graded when no dataset is selected and Customer-0 telemetry is configured.
 * Its questions query live Customer-0 telemetry, so it's actively managed: as cases age out of the
 * retention window it's republished as a dated copy, and this name moves with it. Bumping it resets
 * the baseline that PR comparisons use.
 */
export const DEFAULT_INVESTIGATION_DATASET_NAME = 'ns-investigation-golden-1910';

export type InvestigationDatasetSource =
  | { kind: 'stored'; name: string }
  | { kind: 'file'; path?: string };

/**
 * Picks the dataset a run grades: an explicit stored name or file, else the default stored
 * dataset when remote telemetry is configured, else the bundled synthetic questions. Without
 * telemetry the default dataset's investigations would find nothing to query.
 */
export const resolveInvestigationDatasetSource = (
  env: Record<string, string | undefined> = process.env
): InvestigationDatasetSource => {
  const datasetName = env.NIGHTSHIFT_DATASET_NAME?.trim();
  const examplesFile = env.NIGHTSHIFT_EXAMPLES_FILE?.trim();
  if (datasetName && examplesFile) {
    throw new Error('Choose either NIGHTSHIFT_DATASET_NAME or NIGHTSHIFT_EXAMPLES_FILE, not both');
  }
  if (datasetName) return { kind: 'stored', name: datasetName };
  if (examplesFile) return { kind: 'file', path: examplesFile };
  return env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL
    ? { kind: 'stored', name: DEFAULT_INVESTIGATION_DATASET_NAME }
    : { kind: 'file' };
};

/** Loads the stored dataset or file of investigation questions that `source` selects. */
export const loadInvestigationDataset = async (
  client: Pick<EvalsClient, 'getDatasetByName'>,
  source: InvestigationDatasetSource = resolveInvestigationDatasetSource()
): Promise<EvaluationDataset<InvestigationExample>> => {
  if (source.kind === 'file') return readInvestigationDataset(source.path);

  const datasetName = source.name;
  const dataset = await client.getDatasetByName(datasetName);
  if (!dataset) throw new Error(`Investigation dataset not found: ${datasetName}`);
  const examples = z
    .array(investigationExampleSchema.extend({ id: z.string().min(1) }))
    .min(1)
    .max(1_000)
    .parse(dataset.examples);
  assertDistinctCaseIds(examples);
  return {
    name: dataset.name,
    description: dataset.description,
    tags: dataset.tags,
    maturity: dataset.maturity,
    examples,
  };
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
