/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import type { ToolCallStep } from '@kbn/agent-builder-common';
import {
  assertOrcaSource,
  hasOrcaTelemetryQuery,
  getOrcaDatasetHash,
  loadOrcaDataset,
  validateOrcaDataset,
} from './orca_dataset';

const example = {
  id: 'example',
  input: { question: 'Investigate the incident.' },
  output: { reference_answer: 'The cause.' },
  metadata: { case_id: 'incident' },
};
const dataset = {
  id: 'dataset',
  name: 'nightshift/release',
  description: 'A release',
  tags: [],
  examples: [example],
};
const release = {
  id: dataset.id,
  name: dataset.name,
  examples: 1,
  sha256: getOrcaDatasetHash(dataset.examples),
};

describe('pinned ORCA release', () => {
  it('preserves stored example identity and the validated payload for execution', () => {
    expect(validateOrcaDataset(dataset, release).examples).toEqual([example]);
  });
  it.each([
    { ...dataset, id: 'another-dataset' },
    { ...dataset, examples: [] },
    { ...dataset, examples: [{ ...example, input: { question: 'Changed symptom' } }] },
    { ...dataset, examples: [{ ...example, output: { reference_answer: 'Changed label' } }] },
    { ...dataset, examples: [{ ...example, metadata: { case_id: 'another-incident' } }] },
  ])('rejects drift in identity, coverage, questions, labels or metadata: %j', (changed) => {
    expect(() => validateOrcaDataset(changed, release)).toThrow();
  });
  it('ignores object key order while retaining all payload values', () => {
    const reordered = {
      ...example,
      metadata: { ...example.metadata },
      input: { ...example.input },
      output: { ...example.output },
    };
    expect(getOrcaDatasetHash([reordered])).toBe(release.sha256);
  });
  it('fails if Golden is unavailable, without reading a bundled file', async () => {
    await expect(
      loadOrcaDataset({ getDatasetByName: jest.fn().mockResolvedValue(null) })
    ).rejects.toThrow('missing from Golden');
  });
});

const call = {
  type: ConversationRoundStepType.toolCall,
  tool_call_id: 'call',
  tool_id: 'nightshift_sandbox_bash',
  params: { connector_id: 'nightshift-evals-telemetry', command: 'curl ...' },
  results: [
    {
      tool_result_id: 'result',
      type: ToolResultType.other,
      data: { stdout: '{"values":[[14268]]}', stderr: '', exit_code: 0 },
    },
  ],
} satisfies ToolCallStep;

describe('ORCA telemetry evidence', () => {
  it.each([
    '{"values":[[14268]]}',
    '[[14268,"checkout"]]',
    '14268',
    "[14268, 'checkout']",
    "{'@timestamp': '2026-04-19T16:30:00Z'}",
    '     count     \n---------------\n14268          ',
    'service.name  |    count    \n--------------+-------------\ncheckout      |1203         ',
    '      @timestamp       \n-----------------------\n2026-04-19T16:30:00.000Z',
  ])('accepts returned telemetry in JSON, ES|QL text and sandbox Python formats: %s', (stdout) => {
    expect(
      hasOrcaTelemetryQuery([
        { steps: [{ ...call, results: [{ ...call.results[0], data: { stdout, exit_code: 0 } }] }] },
      ])
    ).toBe(true);
  });
  it.each([
    { ...call, tool_id: 'execute_api' },
    { ...call, params: { ...call.params, connector_id: 'another-cluster' } },
    {
      ...call,
      results: [{ ...call.results[0], data: { stdout: '{"values":[[0]]}', exit_code: 0 } }],
    },
    ...[
      '     count     \n---------------\n0              ',
      'p95_ms | service.name\n-------+------------\n',
    ].map((stdout) => ({
      ...call,
      results: [{ ...call.results[0], data: { stdout, exit_code: 0 } }],
    })),
    {
      ...call,
      results: [
        {
          ...call.results[0],
          data: {
            stdout: '{"values":[[14268]]}',
            stderr: 'curl: (22) The requested URL returned error: 403',
            exit_code: 0,
          },
        },
      ],
    },
    {
      ...call,
      results: [{ ...call.results[0], data: { stdout: '{"values":[[14268]]}', exit_code: 1 } }],
    },
  ])('rejects wrong targets, empty data and masked failures: %j', (step) => {
    expect(hasOrcaTelemetryQuery([{ steps: [step] }])).toBe(false);
  });
});

describe('ORCA source preflight', () => {
  const env = {
    NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://orca.example',
    NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: 'private-key',
    NIGHTSHIFT_ORCA_TELEMETRY: '1',
  };
  it('checks all three historical signals with the read key', async () => {
    const request = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    request
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [[14268]] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [[11864]] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [[117594]] })));
    await expect(assertOrcaSource(request, env)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls[0][1]?.headers).toEqual({
      Authorization: 'ApiKey private-key',
      'Content-Type': 'application/json',
    });
  });
  it.each([
    new Response('', { status: 403 }),
    new Response(JSON.stringify({ values: [[0]] })),
    new Response(JSON.stringify({ values: [[14268]], is_partial: true })),
  ])(
    'rejects unusable credentials, missing data or partial responses before investigations',
    async (response) => {
      const request = jest.fn().mockImplementation(async () => response.clone());
      await expect(assertOrcaSource(request, env)).rejects.toThrow('ORCA');
    }
  );
});
