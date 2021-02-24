/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { versionService } from '../version';
import { MOCK_VERSION_STRING, getMockVersionInfo } from '../__fixtures__/version';

import {
  generateNewIndexName,
  getReindexWarnings,
  sourceNameForIndex,
  transformFlatSettings,
} from './index_settings';

const { currentMajor, prevMajor } = getMockVersionInfo();

describe('transformFlatSettings', () => {
  it('does not blow up for empty mappings', () => {
    expect(
      transformFlatSettings({
        settings: {},
        mappings: {},
      })
    ).toEqual({
      settings: {},
      mappings: {},
    });
  });

  it('removes settings that cannot be set on a new index', () => {
    expect(
      transformFlatSettings({
        settings: {
          // Settings that should get preserved
          'index.number_of_replicas': '1',
          'index.number_of_shards': '5',

          // Blacklisted settings
          'index.allocation.existing_shards_allocator': 'gateway_allocator',
          'index.blocks.write': 'true',
          'index.creation_date': '1547052614626',
          'index.frozen': 'true',
          'index.history.uuid': 'i66b9149a-00ee-42d9-8ca1-85ae9279234gh',
          'index.merge.enabled': 'true',
          'index.provided_name': 'test1',
          'index.resize.source.name': 'resizeName',
          'index.resize.source.uuid': 'k34b9149a-00ee-42d9-8ca1-85ae9279234zs',
          'index.routing.allocation.initial_recovery._id': '1',
          'index.search.throttled': 'true',
          'index.source_only': 'true',
          'index.shrink.source.name': 'shrinkSourceName',
          'index.shrink.source.uuid': 'q34b9149a-00ee-42d9-8ca1-85ae234324df',
          'index.store.snapshot.repository_name': 'repoName',
          'index.store.snapshot.snapshot_name': 'snapshotName',
          'index.store.snapshot.snapshot_uuid': 'f345c9149a-00ee-42d9-8ca1-85ae234324df',
          'index.store.snapshot.index_name': 'snapshotIndexName',
          'index.store.snapshot.index_uuid': 'h764f9149a-00ee-42d9-8ca1-85ae234324af',
          'index.uuid': 'i66b9149a-00ee-42d9-8ca1-85ae927924bf',
          'index.verified_before_close': 'true',
          'index.version.created': '123123',
          'index.version.upgraded': '123123',
        },
        mappings: {},
      })
    ).toEqual({
      settings: {
        'index.number_of_replicas': '1',
        'index.number_of_shards': '5',
      },
      mappings: {},
    });
  });

  it('does not allow index.mapper.dynamic to be set', () => {
    expect(() =>
      transformFlatSettings({
        settings: {
          'index.mapper.dynamic': 'true',
        },
        mappings: {},
      })
    ).toThrowError(`'index.mapper.dynamic' is no longer supported.`);
  });

  it('does not allow index.merge.policy.reclaim_deletes_weight to be set', () => {
    expect(() =>
      transformFlatSettings({
        settings: {
          'index.merge.policy.reclaim_deletes_weight': '2.0d',
        },
        mappings: {},
      })
    ).toThrowError(`'index.merge.policy.reclaim_deletes_weight' is no longer supported.`);
  });

  it('does not allow index.force_memory_term_dictionary to be set', () => {
    expect(() =>
      transformFlatSettings({
        settings: {
          'index.force_memory_term_dictionary': 'false',
        },
        mappings: {},
      })
    ).toThrowError(`'index.force_memory_term_dictionary' is no longer supported.`);
  });

  it('does not index.max_adjacency_matrix_filters to be set', () => {
    expect(() =>
      transformFlatSettings({
        settings: {
          'index.max_adjacency_matrix_filters': '1024',
        },
        mappings: {},
      })
    ).toThrowError(
      `'index.max_adjacency_matrix_filters' is no longer supported; use 'indices.query.bool.max_clause_count' as an alternative.`
    );
  });
});

describe('sourceNameForIndex', () => {
  beforeEach(() => {
    versionService.setup(MOCK_VERSION_STRING);
  });

  it('parses internal indices', () => {
    expect(sourceNameForIndex('.myInternalIndex')).toEqual('.myInternalIndex');
  });

  it('parses non-internal indices', () => {
    expect(sourceNameForIndex('myIndex')).toEqual('myIndex');
  });

  it(`replaces reindexed-v${prevMajor} with reindexed-v${currentMajor} in newIndexName`, () => {
    expect(sourceNameForIndex(`reindexed-v${prevMajor}-myIndex`)).toEqual('myIndex');
    expect(sourceNameForIndex(`.reindexed-v${prevMajor}-myInternalIndex`)).toEqual(
      '.myInternalIndex'
    );
  });
});

describe('generateNewIndexName', () => {
  beforeEach(() => {
    versionService.setup(MOCK_VERSION_STRING);
  });

  it('parses internal indices', () => {
    expect(generateNewIndexName('.myInternalIndex')).toEqual(
      `.reindexed-v${currentMajor}-myInternalIndex`
    );
  });

  it('parses non-internal indices', () => {
    expect(generateNewIndexName('myIndex')).toEqual(`reindexed-v${currentMajor}-myIndex`);
  });

  it(`replaces reindexed-v${prevMajor} with reindexed-v${currentMajor} in generateNewIndexName`, () => {
    expect(generateNewIndexName(`reindexed-v${prevMajor}-myIndex`)).toEqual(
      `reindexed-v${currentMajor}-myIndex`
    );

    expect(generateNewIndexName(`.reindexed-v${prevMajor}-myInternalIndex`)).toEqual(
      `.reindexed-v${currentMajor}-myInternalIndex`
    );
  });
});

describe('getReindexWarnings', () => {
  it('does not blow up for empty mappings', () => {
    expect(
      getReindexWarnings({
        settings: {},
        mappings: {},
      })
    ).toEqual([]);
  });
});
