/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsClient, EvaluationDataset } from '@kbn/evals';
import type { InvestigationExample, InvestigationTaskOutput } from '../types';
import {
  buildOrcaRegradeDataset,
  loadStoredOrcaRuns,
  resolveOrcaRegradeExperiment,
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
      examples: outputs.map((_, index) => ({ example_id: `example-${index}` })),
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
    const outputs = new Map([['b', { case_id: 'b', query: 'b' }]]);
    const dataset = buildOrcaRegradeDataset(release, outputs, 'experiment');
    expect(dataset.name).toBe('nightshift/orca-bench-public755-v2/regrade-experiment');
    expect(dataset.examples.map(({ metadata }) => metadata.case_id)).toEqual(['b']);
    expect(() =>
      buildOrcaRegradeDataset(release, new Map([['z', { case_id: 'z', query: 'z' }]]), 'x')
    ).toThrow('no task for 1 stored runs');
  });

  it('needs the experiment id', () => {
    expect(() => resolveOrcaRegradeExperiment({})).toThrow('NIGHTSHIFT_ORCA_REGRADE_EXPERIMENT');
    expect(resolveOrcaRegradeExperiment({ NIGHTSHIFT_ORCA_REGRADE_EXPERIMENT: ' id ' })).toBe('id');
  });
});
