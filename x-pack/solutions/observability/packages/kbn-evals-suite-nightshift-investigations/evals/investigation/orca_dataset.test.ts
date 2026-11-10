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
  ORCA_PUBLIC_RELEASE,
  ORCA_RELEASE,
  resolveOrcaRun,
  resolveOrcaTelemetryVariant,
  sliceOrcaDataset,
  storeOrcaSlice,
  validateOrcaDataset,
} from './orca_dataset';

const example = {
  id: 'example',
  input: { question: 'Investigate the incident.' },
  output: { reference_answer: 'The cause.' },
  metadata: {
    case_id: 'incident',
    current_time: '2026-04-19T16:22:00.000Z',
    telemetry_snapshot_time: '2026-04-19T16:27:11Z',
  },
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
  it('rejects an example whose current_time is not a timestamp', () => {
    const broken = {
      ...example,
      metadata: { ...example.metadata, current_time: 'not-a-time' },
    };
    const brokenRelease = { ...release, sha256: getOrcaDatasetHash([broken]) };
    expect(() => validateOrcaDataset({ ...dataset, examples: [broken] }, brokenRelease)).toThrow(
      /current_time/
    );
  });
  it('rejects an example without the telemetry snapshot ORCA serves it', () => {
    const { telemetry_snapshot_time: _, ...metadata } = example.metadata;
    const unbounded = { ...example, metadata };
    const unboundedRelease = { ...release, sha256: getOrcaDatasetHash([unbounded]) };
    expect(() =>
      validateOrcaDataset({ ...dataset, examples: [unbounded] }, unboundedRelease)
    ).toThrow(/telemetry_snapshot_time/);
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
      loadOrcaDataset({
        getDatasetByName: jest.fn().mockResolvedValue(null),
        upsertDataset: jest.fn(),
      })
    ).rejects.toThrow('missing from Golden');
  });
});

describe('ORCA release selection', () => {
  it('runs the sampled 50 unless another release is named', () => {
    expect(resolveOrcaRun({})).toEqual({ release: ORCA_RELEASE });
    expect(resolveOrcaRun({ NIGHTSHIFT_ORCA_RELEASE: 'public755' })).toEqual({
      release: ORCA_PUBLIC_RELEASE,
    });
  });
  it('reads a slice of the chosen release', () => {
    expect(
      resolveOrcaRun({ NIGHTSHIFT_ORCA_RELEASE: 'public755', NIGHTSHIFT_ORCA_SLICE: '3/8' })
    ).toEqual({ release: ORCA_PUBLIC_RELEASE, slice: { index: 3, count: 8 } });
  });
  it.each([
    { NIGHTSHIFT_ORCA_RELEASE: 'orca-ech-full-20261019' },
    { NIGHTSHIFT_ORCA_SLICE: '0/8' },
    { NIGHTSHIFT_ORCA_SLICE: '9/8' },
    { NIGHTSHIFT_ORCA_SLICE: '3' },
    { NIGHTSHIFT_ORCA_SLICE: '1/51' },
  ])('rejects %j', (env) => {
    expect(() => resolveOrcaRun(env)).toThrow(/NIGHTSHIFT_ORCA_/);
  });
});

describe('ORCA release slices', () => {
  const many = {
    name: 'nightshift/release',
    description: 'A release',
    examples: Array.from({ length: 10 }, (_, index) => ({
      input: { question: `Question ${index}` },
      metadata: { case_id: `case-${String(9 - index).padStart(2, '0')}` },
    })),
  };
  it('splits the release into contiguous case_id ranges that cover it exactly once', () => {
    const slices = [1, 2, 3].map((index) => sliceOrcaDataset(many, { index, count: 3 }));
    const caseIds = slices.flatMap(({ examples }) =>
      examples.map(({ metadata }) => metadata.case_id)
    );
    expect(caseIds).toEqual([...caseIds].sort());
    expect(new Set(caseIds).size).toBe(10);
    expect(slices.map(({ examples }) => examples.length)).toEqual([3, 3, 4]);
  });
  it('names each slice apart from the release, so running it never upserts over the release', () => {
    const slice = sliceOrcaDataset(many, { index: 2, count: 3 });
    expect(slice.name).toBe('nightshift/release/slice-2-of-3');
    expect(slice.description).toContain('nightshift/release');
  });
  it('validates the whole release before slicing it', async () => {
    const run = { release: { ...release, examples: 2 }, slice: { index: 1, count: 2 } };
    await expect(
      loadOrcaDataset(
        { getDatasetByName: jest.fn().mockResolvedValue(dataset), upsertDataset: jest.fn() },
        run
      )
    ).rejects.toThrow('every pinned incident');
  });

  describe('storing a slice', () => {
    const slice = sliceOrcaDataset(
      {
        ...many,
        examples: many.examples.map((each, index) => ({ ...each, id: `release-${index}` })),
      },
      { index: 1, count: 3 }
    );
    const stored = (examples: typeof slice.examples) => ({
      id: 'slice-dataset',
      name: slice.name,
      description: slice.description,
      examples: examples.map(({ input, metadata }) => ({
        id: `slice-${metadata.case_id}`,
        input,
        output: {},
        metadata,
      })),
    });

    it('stores the slice under its own name and runs it with the ids the server assigned', async () => {
      const client = {
        upsertDataset: jest.fn().mockResolvedValue('slice-dataset'),
        getDatasetByName: jest.fn().mockResolvedValue(stored([...slice.examples].reverse())),
      };

      const result = await storeOrcaSlice(client, slice);

      expect(client.upsertDataset).toHaveBeenCalledWith(
        expect.objectContaining({
          name: slice.name,
          examples: slice.examples.map(({ input, metadata }) => ({
            input,
            output: undefined,
            metadata,
          })),
        })
      );
      expect(client.getDatasetByName).toHaveBeenCalledWith(slice.name);
      expect(result.examples).toEqual(
        slice.examples.map((each) => ({ ...each, id: `slice-${each.metadata.case_id}` }))
      );
    });

    it('fails when the stored slice does not hold exactly its cases', async () => {
      const client = {
        upsertDataset: jest.fn().mockResolvedValue('slice-dataset'),
        getDatasetByName: jest.fn().mockResolvedValue(stored(slice.examples.slice(1))),
      };

      await expect(storeOrcaSlice(client, slice)).rejects.toThrow(/exactly the slice's cases/);
    });
  });
});

const call = {
  type: ConversationRoundStepType.toolCall,
  tool_call_id: 'call',
  tool_id: 'nightshift_sandbox_bash',
  params: { connector_id: 'orcabench-es', command: 'curl ...' },
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
    { ...call, params: { ...call.params, connector_id: 'orcabench-es-0123456789ab' } },
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
  ])('rejects other connectors, empty data and masked failures: %j', (step) => {
    expect(hasOrcaTelemetryQuery([{ steps: [step] }])).toBe(false);
  });
});

describe('ORCA source preflight', () => {
  const source = { url: 'https://orca.example/', apiKey: 'private-key', variant: 'full' } as const;
  it('checks all three historical signals with the read key', async () => {
    const request = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    request
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [[14268]] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [[11864]] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [[117594]] })));
    await expect(assertOrcaSource(source, request)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls[0][0]).toBe('https://orca.example/_query');
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
      // Each in-flight request needs its own body. Cancelling clones of one response deadlocks the tee.
      const body = await response.text();
      const request = jest.fn(async () => new Response(body, { status: response.status }));
      await expect(assertOrcaSource(source, request)).rejects.toThrow('ORCA');
    }
  );

  const answering = (...counts: number[]) => {
    const request = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    counts.forEach((count) =>
      request.mockResolvedValueOnce(new Response(JSON.stringify({ values: [[count]] })))
    );
    return request;
  };
  it('accepts a flag-ablation key only when the run asks for that variant', async () => {
    const noFlags = { ...source, variant: 'no-flags' } as const;
    await expect(
      assertOrcaSource(noFlags, answering(13182, 11136, 115056))
    ).resolves.toBeUndefined();
    await expect(assertOrcaSource(source, answering(13182, 11136, 115056))).rejects.toThrow(
      'pinned full snapshot'
    );
    await expect(assertOrcaSource(noFlags, answering(14268, 11864, 117594))).rejects.toThrow(
      'pinned no-flags snapshot'
    );
  });
});

describe('ORCA telemetry variant', () => {
  it('runs on full telemetry unless the flag ablation is named', () => {
    expect(resolveOrcaTelemetryVariant({})).toBe('full');
    expect(resolveOrcaTelemetryVariant({ NIGHTSHIFT_ORCA_TELEMETRY_VARIANT: 'no-flags' })).toBe(
      'no-flags'
    );
    expect(() =>
      resolveOrcaTelemetryVariant({ NIGHTSHIFT_ORCA_TELEMETRY_VARIANT: 'none' })
    ).toThrow(/NIGHTSHIFT_ORCA_TELEMETRY_VARIANT/);
  });
});
