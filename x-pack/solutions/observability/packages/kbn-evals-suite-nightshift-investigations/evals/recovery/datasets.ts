/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { z, lazySchema } from '@kbn/zod/v4';
import { DatasetTags } from '@kbn/evals-common';
import type { EvaluationDataset } from '@kbn/evals';
import { investigationExampleSchema } from '../investigation/types';
import type { InvestigationExample } from '../investigation/types';
import { recoveryInputSchema } from './compose';

const recoveryFileSchema = lazySchema(() =>
  z.object({
    description: z.string().min(1).max(2_000),
    tags: DatasetTags,
    examples: z
      .array(
        investigationExampleSchema.extend({
          input: investigationExampleSchema.shape.input.extend(recoveryInputSchema.shape),
        })
      )
      .min(1)
      .max(1_000),
  })
);

/** Reads a recovery examples file, checking each example carries its earlier round and alert. */
export const readRecoveryExamplesFile = (
  path: string,
  name: string
): EvaluationDataset<InvestigationExample> => {
  const file = recoveryFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  const caseIds = new Set<string>();
  for (const { metadata } of file.examples) {
    if (caseIds.has(metadata.case_id)) throw new Error(`Duplicate case_id: ${metadata.case_id}`);
    caseIds.add(metadata.case_id);
  }
  return { name, description: file.description, tags: file.tags, examples: file.examples };
};
