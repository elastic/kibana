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
import type { InvestigationExample, InvestigationTaskOutput } from '../investigation/types';

const productionRunSchema = lazySchema(() =>
  z.object({
    steps: z
      .array(
        z.object({
          tool_id: z.string().min(1).max(200),
          params: z.record(z.string(), z.json()),
          result: z.string().max(10_000),
        })
      )
      .max(200),
    conclusion: z.string().min(1).max(20_000),
    summary: z.string().max(20_000).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  })
);

const productionFileSchema = lazySchema(() =>
  z.object({
    description: z.string().min(1).max(2_000),
    tags: DatasetTags,
    examples: z
      .array(
        investigationExampleSchema.extend({
          input: investigationExampleSchema.shape.input.extend({ production: productionRunSchema }),
        })
      )
      .min(1)
      .max(1_000),
  })
);

/** Reads recovery rounds a production agent already ran: each example holds its tool calls and report. */
export const readProductionReplayDataset = (
  path: string,
  name: string
): EvaluationDataset<InvestigationExample> => {
  const file = productionFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  const caseIds = new Set<string>();
  for (const { metadata } of file.examples) {
    if (caseIds.has(metadata.case_id)) throw new Error(`Duplicate case_id: ${metadata.case_id}`);
    caseIds.add(metadata.case_id);
  }
  return { name, description: file.description, tags: file.tags, examples: file.examples };
};

/** The task output of a recovered round the production agent ran, so the judges read it like a fresh run. */
export const replayProductionRun = (example: InvestigationExample): InvestigationTaskOutput => {
  const { production } = z.object({ production: productionRunSchema }).parse(example.input);
  return {
    case_id: example.metadata.case_id,
    query: example.input.question,
    workflow_status: 'complete',
    structured_report: {
      conclusion: production.conclusion,
      ...(production.summary ? { summary: production.summary } : {}),
      ...(production.severity ? { severity: production.severity } : {}),
    },
    conversation_round_count: 1,
    tool_call_trajectory: production.steps,
    tool_call_count: production.steps.length,
  };
};
