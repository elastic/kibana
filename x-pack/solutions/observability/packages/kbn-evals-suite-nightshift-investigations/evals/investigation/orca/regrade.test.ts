/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsClient, EvaluationDataset } from '@kbn/evals';
import { MAX_SCORES_PER_QUERY } from '@kbn/evals-common';
import type { InvestigationExample, InvestigationTaskOutput } from '../types';
import { NO_CONCLUSION_ERROR } from '../task';
import {
  buildOrcaRegradeDataset,
  loadStoredOrcaRuns,
  needsOrcaReport,
  resolveOrcaRegradeExperiment,
  storeOrcaRegradeDataset,
} from './regrade';

type Client = Pick<
  EvalsClient,
  'getExperimentStats' | 'getExperimentDatasetExamples' | 'getExperimentExampleDetails'
>;

const clientWith = (outputs: Array<Partial<InvestigationTaskOutput>>, datasetIds = ['dataset']) =>
  ({
    getExperimentStats: jest.fn().mockResolvedValue({
      stats: datasetIds.map((datasetId) => ({ datasetId })),
      taskModel: { id: 'claude' },
      totalRepetitions: 1,
    }),
    getExperimentDatasetExamples: jest.fn().mockResolvedValue({
      examples: outputs.map((_, index) => ({ example_id: `example-${index}`, scores: [{}] })),
    }),
    getExperimentExampleDetails: jest.fn(
      async (_experimentId: string, _datasetId: string, exampleId: string) => ({
        task: { output: outputs[Number(exampleId.split('-')[1])] },
      })
    ),
  } as unknown as Client);

describe('ORCA re-grade', () => {
  it('reads every stored run with its full output and the model that ran it', async () => {
    const client = clientWith([
      { case_id: 'a', query: 'Why?', orca_report_md: '' },
      { case_id: 'b', query: 'Why?' },
    ]);
    const { taskModelId, outputs } = await loadStoredOrcaRuns(client, 'experiment');
    expect(taskModelId).toBe('claude');
    expect([...outputs.keys()]).toEqual(['a', 'b']);
    expect(outputs.get('a')?.orca_report_md).toBe('');
    expect(client.getExperimentExampleDetails).toHaveBeenCalledWith(
      'experiment',
      'dataset',
      'example-1',
      0
    );
  });

  it('refuses a source read that reached the score API cap, since runs may be missing', async () => {
    const client = clientWith([{ case_id: 'a', query: 'Why?' }]);
    jest.mocked(client.getExperimentDatasetExamples).mockResolvedValue({
      examples: [{ example_id: 'example-0', scores: Array(MAX_SCORES_PER_QUERY).fill({}) }],
    } as unknown as Awaited<ReturnType<Client['getExperimentDatasetExamples']>>);
    await expect(loadStoredOrcaRuns(client, 'experiment')).rejects.toThrow(
      'some runs may be missing'
    );
  });

  it('refuses an experiment over several datasets', async () => {
    await expect(loadStoredOrcaRuns(clientWith([], ['one', 'two']), 'experiment')).rejects.toThrow(
      'one dataset'
    );
  });

  it("takes each run's task from the pinned release under a dataset of its own", () => {
    const release = {
      name: 'nightshift/orca-bench-public755-v2',
      description: 'Public 755.',
      examples: ['a', 'b', 'c'].map((caseId) => ({
        input: { question: caseId },
        metadata: { case_id: caseId, orca_expected: { events: [] } },
      })),
    } as EvaluationDataset<InvestigationExample>;
    // An earlier release's run was asked a different question than the pinned release's.
    const outputs = new Map([['b', { case_id: 'b', query: 'b, as v1 asked it' }]]);
    const dataset = buildOrcaRegradeDataset(release, outputs, 'experiment');
    expect(dataset.name).toBe('nightshift/orca-bench-public755-v2/regrade-experiment');
    expect(dataset.examples.map(({ metadata }) => metadata.case_id)).toEqual(['b']);
    expect(dataset.examples[0].input.question).toBe('b, as v1 asked it');
    expect(() =>
      buildOrcaRegradeDataset(release, new Map([['z', { case_id: 'z', query: 'z' }]]), 'x')
    ).toThrow('no task for 1 stored runs');
  });

  it('writes a report.md only for a gradable run stored before the report step', () => {
    const run = (output: Partial<InvestigationTaskOutput>) =>
      needsOrcaReport({ case_id: 'a', query: 'Why?', ...output });
    expect(run({})).toBe(true);
    // An empty report is the model's answer, not a missing one.
    expect(run({ orca_report_md: '' })).toBe(false);
    expect(run({ orca_report_md: '# Report' })).toBe(false);
    expect(run({ orca_report_error: 'report model failed' })).toBe(false);
    // ORCA leaves these unscored, or scores the agent's failure without a report.
    expect(run({ execution_error: 'Investigation round failed: boom' })).toBe(false);
    expect(run({ execution_error: NO_CONCLUSION_ERROR })).toBe(false);
    expect(run({ report_truncated: true })).toBe(false);
  });

  it("scores under the stored re-grade dataset's example ids, not the release's", async () => {
    const dataset = {
      name: 'nightshift/orca-bench-public755-v2/regrade-experiment',
      description: 'Re-grade.',
      examples: ['a', 'b'].map((caseId) => ({
        id: `release-${caseId}`,
        input: { question: caseId },
        metadata: { case_id: caseId },
      })),
    } as EvaluationDataset<InvestigationExample>;
    const client = {
      upsertDataset: jest.fn().mockResolvedValue('regrade-dataset'),
      getDatasetByName: jest.fn().mockResolvedValue({
        examples: ['b', 'a'].map((caseId) => ({
          id: `regrade-${caseId}`,
          metadata: { case_id: caseId },
        })),
      }),
    } as unknown as Pick<EvalsClient, 'getDatasetByName' | 'upsertDataset'>;
    const stored = await storeOrcaRegradeDataset(client, dataset);
    // The executor reads `id` off each example, which `InvestigationExample` doesn't declare.
    expect((stored.examples as Array<{ id?: string }>).map(({ id }) => id)).toEqual([
      'regrade-a',
      'regrade-b',
    ]);
    // The release's ids are not sent with the examples it stores.
    expect(jest.mocked(client.upsertDataset).mock.calls[0][0].examples[0]).not.toHaveProperty('id');
  });

  it('needs the experiment id', () => {
    expect(() => resolveOrcaRegradeExperiment({})).toThrow('NIGHTSHIFT_ORCA_REGRADE_EXPERIMENT');
    expect(resolveOrcaRegradeExperiment({ NIGHTSHIFT_ORCA_REGRADE_EXPERIMENT: ' id ' })).toBe('id');
  });
});
