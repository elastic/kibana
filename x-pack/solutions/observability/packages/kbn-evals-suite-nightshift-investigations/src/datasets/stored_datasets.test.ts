/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STORED_DATASETS,
  assertStoredDatasetTags,
  selectStoredDatasets,
  storedDatasetIdsForShard,
  type StoredDataset,
} from './stored_datasets';

const GOLDEN: StoredDataset = {
  id: 'golden',
  eval: 'investigation',
  shard: 'customer0-golden',
  name: 'ns-investigation-golden-2710',
  requiredTags: ['customer0'],
};

describe('assertStoredDatasetTags', () => {
  it('passes when every required tag is present', () => {
    expect(() => assertStoredDatasetTags(GOLDEN, ['nightshift', 'customer0'])).not.toThrow();
  });

  it('passes an entry without required tags', () => {
    expect(() => assertStoredDatasetTags({ ...GOLDEN, requiredTags: undefined })).not.toThrow();
  });

  it.each([
    ['without the tag', ['nightshift']],
    ['without tags', undefined],
  ])('fails a dataset %s', (_label, tags) => {
    expect(() => assertStoredDatasetTags(GOLDEN, tags)).toThrow(
      '"ns-investigation-golden-2710" is missing the required tag(s) customer0'
    );
  });
});

describe('stored dataset config', () => {
  it('gives every entry a unique id', () => {
    const ids = STORED_DATASETS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps each CI shard to its stored datasets', () => {
    expect(storedDatasetIdsForShard('customer0-golden')).toEqual(['golden']);
    expect(storedDatasetIdsForShard('customer0-connector-probes')).toEqual(['connector-elastic']);
    // The recovery datasets are opt-in: no CI shard runs them.
    expect(storedDatasetIdsForShard('customer0-recovery')).toEqual([]);
    expect(storedDatasetIdsForShard('orcabench')).toEqual([]);
    expect(storedDatasetIdsForShard(undefined)).toEqual([]);
  });

  it('selects entries by eval and id, in config order', () => {
    expect(
      selectStoredDatasets('investigation', ['connector-elastic', 'golden']).map(({ id }) => id)
    ).toEqual(['golden']);
    expect(selectStoredDatasets('connector-probe', ['golden'])).toEqual([]);
  });

  it('scores the recovery dataset with the recovery eval and requires its tag', () => {
    expect(selectStoredDatasets('recovery', ['golden', 'recovery'])).toEqual([
      expect.objectContaining({ id: 'recovery', name: 'ns-recovery-round-1811' }),
    ]);
    expect(selectStoredDatasets('investigation', ['recovery'])).toEqual([]);
    expect(STORED_DATASETS.find(({ id }) => id === 'recovery')?.requiredTags).toEqual([
      'customer0-recovery',
    ]);
  });

  it('pins a golden cut and requires its customer0 tag, so the retrospective guardrail applies', () => {
    const golden = STORED_DATASETS.find(({ id }) => id === 'golden');
    expect(golden?.name).toMatch(/^ns-investigation-golden-\d{4}$/);
    expect(golden?.requiredTags).toEqual(['customer0']);
  });
});
