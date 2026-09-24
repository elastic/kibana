/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadInvestigationDataset, readInvestigationDataset } from './datasets';

describe('stored investigation dataset', () => {
  const dataset = {
    id: 'stored-dataset',
    name: 'Operator questions',
    description: 'Curated through the UI',
    tags: ['operator'],
    examples: [
      {
        id: 'stored-example',
        input: { question: 'Investigate the signal.' },
        output: { reference_answer: 'Optional label' },
        metadata: { case_id: 'signal', category: 'latency' },
      },
    ],
  };

  it('loads the selected ID and preserves example IDs, labels and operator metadata', async () => {
    const client = { getDatasetById: jest.fn().mockResolvedValue(dataset) };
    await expect(loadInvestigationDataset(client, { datasetId: dataset.id })).resolves.toEqual(
      dataset
    );
    expect(client.getDatasetById).toHaveBeenCalledWith('stored-dataset');
  });

  it('fails before running when the dataset is missing or has duplicate case IDs', async () => {
    const client = { getDatasetById: jest.fn().mockResolvedValue(null) };
    await expect(loadInvestigationDataset(client, { datasetId: dataset.id })).rejects.toThrow(
      'Investigation dataset not found'
    );
    client.getDatasetById.mockResolvedValue({
      ...dataset,
      examples: [...dataset.examples, ...dataset.examples],
    });
    await expect(loadInvestigationDataset(client, { datasetId: dataset.id })).rejects.toThrow(
      'Duplicate case_id'
    );
  });

  it('rejects ambiguous file and stored dataset selections before fetching', async () => {
    const client = { getDatasetById: jest.fn() };
    await expect(
      loadInvestigationDataset(client, {
        datasetId: dataset.id,
        examplesFile: '/tmp/examples.json',
      })
    ).rejects.toThrow('Choose either NIGHTSHIFT_DATASET_ID or NIGHTSHIFT_EXAMPLES_FILE');
    expect(client.getDatasetById).not.toHaveBeenCalled();
  });
});

describe('investigation file dataset', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nightshift-dataset-'));
  const path = join(directory, 'examples.json');

  afterAll(() => rmSync(directory, { recursive: true, force: true }));

  it('loads questions and stable case IDs without labels or grader metadata', () => {
    writeFileSync(
      path,
      JSON.stringify({
        dataset: 'nightshift/synthetic-test',
        examples: [
          {
            input: { question: 'Investigate the synthetic timeout.' },
            metadata: { case_id: 'timeout' },
          },
        ],
      })
    );

    expect(readInvestigationDataset(path)).toMatchObject({
      name: 'nightshift/synthetic-test',
      examples: [
        {
          input: { question: 'Investigate the synthetic timeout.' },
          metadata: { case_id: 'timeout' },
        },
      ],
    });
  });

  it('rejects duplicate case IDs instead of reporting ambiguous example coverage', () => {
    writeFileSync(
      path,
      JSON.stringify({
        dataset: 'nightshift/synthetic-test',
        examples: [
          { input: { question: 'First question' }, metadata: { case_id: 'duplicate' } },
          { input: { question: 'Second question' }, metadata: { case_id: 'duplicate' } },
        ],
      })
    );
    expect(() => readInvestigationDataset(path)).toThrow('Duplicate case_id');
  });

  it.each([
    { dataset: 'nightshift/empty', examples: [] },
    {
      dataset: 'another-owner/examples',
      examples: [{ input: { question: 'Question' }, metadata: { case_id: 'case' } }],
    },
    {
      dataset: 'nightshift/invalid',
      examples: [{ input: { question: '   ' }, metadata: { case_id: 'case' } }],
    },
    {
      dataset: 'nightshift/invalid',
      examples: [{ input: { question: 'Question' }, metadata: {} }],
    },
  ])('rejects an empty or malformed dataset: %j', (file) => {
    writeFileSync(path, JSON.stringify(file));
    expect(() => readInvestigationDataset(path)).toThrow();
  });

  it('preserves optional reference answers and operator metadata', () => {
    const example = {
      input: { question: 'Investigate the signal.' },
      output: { reference_answer: 'An optional label' },
      metadata: { case_id: 'signal', source: 'operator', max_latency_seconds: 300 },
    };
    writeFileSync(path, JSON.stringify({ dataset: 'nightshift/optional', examples: [example] }));
    expect(readInvestigationDataset(path).examples).toEqual([example]);
  });

  it('rejects invalid JSON', () => {
    writeFileSync(path, '{');
    expect(() => readInvestigationDataset(path)).toThrow();
  });

  it.each([
    ['a'.repeat(65)],
    ['invalid tag'],
    Array.from({ length: 19 }, (_, index) => `tag-${index}`),
  ])('rejects tags the dataset upsert API cannot accept: %j', (...tags) => {
    writeFileSync(
      path,
      JSON.stringify({
        dataset: 'nightshift/tags',
        tags,
        examples: [{ input: { question: 'Question' }, metadata: { case_id: 'case' } }],
      })
    );
    expect(() => readInvestigationDataset(path)).toThrow();
  });

  it('reserves space for required tags within the API limit', () => {
    writeFileSync(
      path,
      JSON.stringify({
        dataset: 'nightshift/tags',
        tags: ['a'.repeat(64), ...Array.from({ length: 17 }, (_, index) => `tag-${index}`)],
        examples: [{ input: { question: 'Question' }, metadata: { case_id: 'case' } }],
      })
    );
    expect(readInvestigationDataset(path).tags).toHaveLength(20);
  });
});
