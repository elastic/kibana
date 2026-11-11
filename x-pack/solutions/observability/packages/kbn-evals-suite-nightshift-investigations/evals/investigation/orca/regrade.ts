/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import pMap from 'p-map';
import { z, lazySchema } from '@kbn/zod/v4';
import type { EvalsClient, EvaluationDataset } from '@kbn/evals';
import type { InvestigationExample, InvestigationTaskOutput } from '../types';
import { orcaRunUnscoredReason } from './report';

/** The experiment `NIGHTSHIFT_ORCA_REGRADE_EXPERIMENT` names. */
export const resolveOrcaRegradeExperiment = (
  env: Record<string, string | undefined> = process.env
): string => {
  const experimentId = env.NIGHTSHIFT_ORCA_REGRADE_EXPERIMENT?.trim();
  assert(experimentId, 'NIGHTSHIFT_ORCA_REGRADE_EXPERIMENT must name the experiment to re-grade');
  return experimentId;
};

const storedOutputSchema = lazySchema(() =>
  z.looseObject({ case_id: z.string().min(1), query: z.string() })
);

export interface StoredOrcaRuns {
  /** The model that ran the investigations, which must also write any missing report.md. */
  taskModelId?: string;
  outputs: ReadonlyMap<string, InvestigationTaskOutput>;
}

/** Every stored run of an ORCA experiment, keyed by `case_id`, with its full task output. */
export const loadStoredOrcaRuns = async (
  client: Pick<
    EvalsClient,
    'getExperimentStats' | 'getExperimentDatasetExamples' | 'getExperimentExampleDetails'
  >,
  experimentId: string
): Promise<StoredOrcaRuns> => {
  const stats = await client.getExperimentStats(experimentId);
  const datasetIds = [...new Set(stats?.stats.map(({ datasetId }) => datasetId))];
  assert(stats && datasetIds.length === 1, `Experiment ${experimentId} must have one dataset`);
  const [datasetId] = datasetIds;
  assert(stats.totalRepetitions <= 1, 'ORCA runs each task once; re-grade one repetition');
  const { examples } = await client.getExperimentDatasetExamples(experimentId, datasetId);
  const outputs = await pMap(
    examples,
    async ({ example_id: exampleId }) => {
      const details = await client.getExperimentExampleDetails(
        experimentId,
        datasetId,
        exampleId,
        0
      );
      // The run's own output, as the task returned it; only its identity is checked here.
      return storedOutputSchema.parse(details.task.output) as InvestigationTaskOutput;
    },
    { concurrency: 8 }
  );
  const byCase = new Map(outputs.map((output) => [output.case_id, output]));
  assert(byCase.size === outputs.length, `Experiment ${experimentId} repeats a case_id`);
  return { taskModelId: stats.taskModel?.id, outputs: byCase };
};

/**
 * The release's examples for the stored runs, under a dataset of their own: each example's
 * metadata comes from the pinned release, so runs of an earlier release get its `orca_expected`.
 */
export const buildOrcaRegradeDataset = (
  release: EvaluationDataset<InvestigationExample>,
  outputs: ReadonlyMap<string, InvestigationTaskOutput>,
  experimentId: string
): EvaluationDataset<InvestigationExample> => {
  const examples = release.examples.filter(({ metadata }) => outputs.has(metadata.case_id));
  const missing = [...outputs.keys()].filter(
    (caseId) => !examples.some(({ metadata }) => metadata.case_id === caseId)
  );
  assert(
    missing.length === 0,
    `${release.name} has no task for ${missing.length} stored runs, for example ${missing[0]}`
  );
  return {
    ...release,
    name: `${release.name}/regrade-${experimentId}`,
    description: `ORCA's graders on the stored runs of experiment ${experimentId}. ${release.description}`,
    examples,
  };
};

/** A stored run from before the report step, whose investigation ORCA can still grade. */
export const needsOrcaReport = (output: InvestigationTaskOutput): boolean =>
  output.orca_report_md === undefined &&
  !output.orca_report_error &&
  orcaRunUnscoredReason(output) === undefined;
