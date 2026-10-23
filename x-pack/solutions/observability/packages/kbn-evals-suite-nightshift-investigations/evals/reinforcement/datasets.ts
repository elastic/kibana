/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { lazySchema, z } from '@kbn/zod/v4';
import type { EvaluationDataset } from '@kbn/evals';
import { reinforcementExamples } from './traces';
import type { ReinforcementExample } from './types';

const fileSchema = lazySchema(() =>
  z.object({
    examples: z.array(z.custom<ReinforcementExample>()).min(1).max(20),
  })
);

/** Committed Customer-0 rounds, or the JSON file in `NIGHTSHIFT_REINFORCEMENT_TRACES_FILE`. */
export const loadReinforcementExamples = (
  examplesFile = process.env.NIGHTSHIFT_REINFORCEMENT_TRACES_FILE
): ReinforcementExample[] => {
  if (!examplesFile) return reinforcementExamples;
  const file = fileSchema.parse(JSON.parse(readFileSync(examplesFile, 'utf8')));
  return file.examples;
};

export const reinforcementDataset = (
  examples = loadReinforcementExamples()
): EvaluationDataset<ReinforcementExample> => ({
  name: 'nightshift/reinforcement-customer0',
  description:
    'Reduced Customer-0 investigation rounds replayed through the decision-tree reinforcement agent.',
  tags: ['nightshift', 'reinforcement', 'customer0'],
  examples,
});
