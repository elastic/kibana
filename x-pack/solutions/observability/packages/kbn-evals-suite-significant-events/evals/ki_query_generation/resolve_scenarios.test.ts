/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetConfig, KIQueryGenerationScenario } from '../../src/datasets';
import {
  assertQueryGenerationDatasetSafety,
  resolveQueryGenerationDatasets,
  resolveQueryGenerationDatasetName,
  type QueryGenerationDatasetResolution,
} from './resolve_scenarios';

const scenario = (id: string): KIQueryGenerationScenario => ({
  input: {
    scenario_id: id,
    stream_name: 'logs',
    stream_description: id,
  },
  output: {
    criteria: [],
    expected_categories: [],
    expected_ground_truth: 'ground-truth',
  },
  metadata: {
    difficulty: 'medium',
    failure_domain: 'test-domain',
  },
});

const dataset = (id: string, scenarioIds: string[]): DatasetConfig => ({
  id,
  description: id,
  gcs: { bucket: 'bucket', basePathPrefix: 'prefix' },
  kiQueryGeneration: scenarioIds.map(scenario),
  kiFeatureExtraction: [],
  kiFeatureExclusion: [],
  kiFeatureDeduplication: [],
  discovery: [],
});

const DATASETS = [
  dataset('otel-demo', ['healthy-baseline', 'payment-unreachable']),
  dataset('bank-of-anthos', ['healthy-baseline', 'ledger-db-disconnect']),
];

const names = (res: QueryGenerationDatasetResolution) => res.datasets;

describe('resolveQueryGenerationDatasets', () => {
  it('returns every scenario when the selection is unset', () => {
    expect(names(resolveQueryGenerationDatasets(DATASETS, undefined))).toEqual(DATASETS);
  });

  it('returns every scenario for an empty selection', () => {
    expect(names(resolveQueryGenerationDatasets(DATASETS, ''))).toEqual(DATASETS);
  });

  it('reports a full run as unfocused with the union sorted', () => {
    const res = resolveQueryGenerationDatasets(DATASETS, undefined);
    expect(res.isFocused).toBe(false);
    expect(res.selectedScenarioIds).toEqual([
      'healthy-baseline',
      'ledger-db-disconnect',
      'payment-unreachable',
    ]);
  });

  it('reports a focused run with sorted selected ids', () => {
    const res = resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect,healthy-baseline');
    expect(res.isFocused).toBe(true);
    expect(res.selectedScenarioIds).toEqual(['healthy-baseline', 'ledger-db-disconnect']);
  });

  it('returns a single valid ID once', () => {
    expect(names(resolveQueryGenerationDatasets(DATASETS, 'payment-unreachable'))).toEqual([
      {
        ...DATASETS[0],
        kiQueryGeneration: [DATASETS[0].kiQueryGeneration[1]],
      },
    ]);
  });

  it('deduplicates duplicate IDs', () => {
    expect(
      names(resolveQueryGenerationDatasets(DATASETS, 'healthy-baseline,healthy-baseline'))
    ).toEqual([
      { ...DATASETS[0], kiQueryGeneration: [DATASETS[0].kiQueryGeneration[0]] },
      { ...DATASETS[1], kiQueryGeneration: [DATASETS[1].kiQueryGeneration[0]] },
    ]);
  });

  it('preserves source order across multiple IDs', () => {
    expect(
      names(resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect,payment-unreachable'))
    ).toEqual([
      { ...DATASETS[0], kiQueryGeneration: [DATASETS[0].kiQueryGeneration[1]] },
      { ...DATASETS[1], kiQueryGeneration: [DATASETS[1].kiQueryGeneration[1]] },
    ]);
  });

  it('skips other datasets when an ID is present in only one dataset', () => {
    expect(names(resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect'))).toEqual([
      { ...DATASETS[1], kiQueryGeneration: [DATASETS[1].kiQueryGeneration[1]] },
    ]);
  });

  it('throws and lists available IDs for an unknown ID', () => {
    expect(() => resolveQueryGenerationDatasets(DATASETS, 'nope')).toThrow(
      /nope.*Available: healthy-baseline, payment-unreachable, ledger-db-disconnect/
    );
  });

  it('throws on empty comma items', () => {
    expect(() => resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect,')).toThrow(
      /empty item/
    );
    expect(() => resolveQueryGenerationDatasets(DATASETS, ',ledger-db-disconnect')).toThrow(
      /empty item/
    );
  });

  it('does not mutate the source dataset objects', () => {
    const before = JSON.stringify(DATASETS);
    resolveQueryGenerationDatasets(DATASETS, 'healthy-baseline');
    expect(JSON.stringify(DATASETS)).toBe(before);
  });
});

describe('assertQueryGenerationDatasetSafety', () => {
  it.each([
    { selection: undefined, trustUpstreamDataset: true },
    { selection: 'healthy-baseline', trustUpstreamDataset: false },
  ])(
    'allows selection=$selection with trustUpstreamDataset=$trustUpstreamDataset',
    ({ selection, trustUpstreamDataset }) => {
      const resolution = resolveQueryGenerationDatasets(DATASETS, selection);

      expect(() =>
        assertQueryGenerationDatasetSafety(resolution, trustUpstreamDataset)
      ).not.toThrow();
    }
  );

  it('rejects focused runs that trust an upstream dataset', () => {
    const resolution = resolveQueryGenerationDatasets(DATASETS, 'healthy-baseline');

    expect(() => assertQueryGenerationDatasetSafety(resolution, true)).toThrow(
      /KI_QUERY_GENERATION_SCENARIOS cannot be combined with SIGEVENTS_TRUST_UPSTREAM=true/
    );
  });
});

describe('resolveQueryGenerationDatasetName', () => {
  const CANONICAL = 'sigevents: KI query generation (toggle) (canonical) [baseline]';

  it('keeps the canonical name for unfiltered runs', () => {
    const res = resolveQueryGenerationDatasets(DATASETS, undefined);
    expect(resolveQueryGenerationDatasetName(res, CANONICAL)).toBe(CANONICAL);
  });

  it('derives a deterministic compact hash name for focused runs', () => {
    const res = resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect');
    const name = resolveQueryGenerationDatasetName(res, CANONICAL);
    expect(name).toMatch(
      /^sigevents: KI query generation \(toggle\) \(canonical\) \[baseline\] \[focused:[0-9a-f]{12}\]$/
    );
    expect(name).not.toContain('ledger-db-disconnect');
    expect(name).not.toBe(CANONICAL);
  });

  it('is insensitive to selection order', () => {
    const a = resolveQueryGenerationDatasets(DATASETS, 'healthy-baseline,ledger-db-disconnect');
    const b = resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect,healthy-baseline');
    expect(resolveQueryGenerationDatasetName(a, CANONICAL)).toBe(
      resolveQueryGenerationDatasetName(b, CANONICAL)
    );
  });

  it('is insensitive to duplicate ids', () => {
    const a = resolveQueryGenerationDatasets(DATASETS, 'healthy-baseline,ledger-db-disconnect');
    const b = resolveQueryGenerationDatasets(
      DATASETS,
      'healthy-baseline,healthy-baseline,ledger-db-disconnect'
    );
    expect(resolveQueryGenerationDatasetName(a, CANONICAL)).toBe(
      resolveQueryGenerationDatasetName(b, CANONICAL)
    );
  });

  it('keeps different selections distinct', () => {
    const a = resolveQueryGenerationDatasets(DATASETS, 'healthy-baseline');
    const b = resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect');
    expect(resolveQueryGenerationDatasetName(a, CANONICAL)).not.toBe(
      resolveQueryGenerationDatasetName(b, CANONICAL)
    );
  });

  it('adds a fixed-length suffix regardless of selection size', () => {
    const res: QueryGenerationDatasetResolution = {
      datasets: DATASETS,
      isFocused: true,
      selectedScenarioIds: Array.from(
        { length: 1_000 },
        (_, index) => `scenario-${index}-${'x'.repeat(100)}`
      ),
    };
    const name = resolveQueryGenerationDatasetName(res, CANONICAL);

    expect(name).toHaveLength(CANONICAL.length + ' [focused:000000000000]'.length);
    expect(name).toMatch(/\[focused:[0-9a-f]{12}\]$/);
  });
});
