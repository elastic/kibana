/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { lazySchema, z } from '@kbn/zod/v4';
import type { EvaluationDataset, EvalsClient } from '@kbn/evals';
import { investigationExampleSchema, type InvestigationExample } from '../investigation/types';
import type { ReinforcementExample } from './types';

const fileSchema = lazySchema(() =>
  z.object({
    examples: z.array(z.custom<ReinforcementExample>()).min(1).max(20),
  })
);

/**
 * Full reinforcement rounds from `NIGHTSHIFT_REINFORCEMENT_TRACES_FILE`.
 * The default run uses the committed reduced rounds instead of this file.
 */
export const loadReinforcementExamples = (
  examplesFile = process.env.NIGHTSHIFT_REINFORCEMENT_TRACES_FILE
): ReinforcementExample[] => {
  if (!examplesFile) {
    throw new Error(
      'NIGHTSHIFT_REINFORCEMENT_TRACES_FILE is not set. The reinforcement micro-eval replays the committed Customer-0 rounds unless this file is provided.'
    );
  }
  const file = fileSchema.parse(JSON.parse(readFileSync(examplesFile, 'utf8')));
  return file.examples;
};

/** How many Customer-0 investigations the micro-eval runs. */
export const REINFORCEMENT_EXAMPLE_LIMIT = 3;

export const CUSTOMER0_REINFORCEMENT_DATASET = 'nightshift/customer0-manual-v2';

/** The first few examples of a Customer-0 dataset, in stored order. Capped at five. */
export const selectCustomer0Examples = <Example>(
  examples: Example[],
  limit = Number(process.env.NIGHTSHIFT_REINFORCEMENT_LIMIT ?? REINFORCEMENT_EXAMPLE_LIMIT)
): Example[] => {
  const count = Number.isFinite(limit)
    ? Math.max(1, Math.min(5, Math.floor(limit)))
    : REINFORCEMENT_EXAMPLE_LIMIT;
  return examples.slice(0, count);
};

/** Private full-round replay. The default micro-eval does not use this. */
export const reinforcementDataset = (
  examples: ReinforcementExample[]
): EvaluationDataset<ReinforcementExample> => ({
  name: 'nightshift/reinforcement-customer0',
  description:
    'Recorded investigation rounds replayed through the decision-tree reinforcement agent.',
  tags: ['nightshift', 'reinforcement', 'customer0'],
  examples,
});

/**
 * A few Customer-0 investigations. Reinforcement is the post-execution run the investigation
 * already waits for; this dataset does not start a second one.
 */
export const customer0ReinforcementDataset = (
  examples: InvestigationExample[]
): EvaluationDataset<InvestigationExample> => ({
  name: 'nightshift/reinforcement-customer0',
  description:
    'Customer-0 investigations whose post-execution decision-tree reinforcement submit is graded.',
  tags: ['nightshift', 'reinforcement', 'customer0'],
  examples,
});

/** Loads a few examples from the golden Customer-0 dataset. Does not read `NIGHTSHIFT_EXAMPLES_FILE`. */
export const loadCustomer0ReinforcementDataset = async (
  client: Pick<EvalsClient, 'getDatasetByName'>,
  datasetName = process.env.NIGHTSHIFT_REINFORCEMENT_DATASET ?? CUSTOMER0_REINFORCEMENT_DATASET
): Promise<EvaluationDataset<InvestigationExample>> => {
  const dataset = await client.getDatasetByName(datasetName);
  if (!dataset) throw new Error(`Customer-0 dataset not found: ${datasetName}`);
  const examples = z
    .array(investigationExampleSchema.extend({ id: z.string().min(1) }))
    .min(1)
    .max(1_000)
    .parse(dataset.examples);
  return customer0ReinforcementDataset(selectCustomer0Examples(examples));
};
