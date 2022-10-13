/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAJOR_VERSION } from '../../../common/constants';
import { versionService } from '../version';
import { getMockVersionInfo } from '../__fixtures__/version';

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
          // @ts-expect-error @elastic/elasticsearch doesn't declare it
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
          'index.mapper.dynamic': 'true',

          // Deprecated settings
          'index.force_memory_term_dictionary': '1024',
          'index.max_adjacency_matrix_filters': 'true',
          'index.soft_deletes.enabled': 'true',
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

  it('removes index.translog.retention.size if soft deletes is enabled', () => {
    expect(
      transformFlatSettings({
        settings: {
          // Settings that should get preserved
          // @ts-expect-error @elastic/elasticsearch doesn't declare it
          'index.number_of_replicas': '1',
          'index.number_of_shards': '5',

          // Deprecated settings
          'index.soft_deletes.enabled': 'true',
          'index.translog.retention.size': '5b',
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

  it('removes index.translog.retention.age if soft deletes is enabled', () => {
    expect(
      transformFlatSettings({
        settings: {
          // Settings that should get preserved
          // @ts-expect-error @elastic/elasticsearch doesn't declare it
          'index.number_of_replicas': '1',
          'index.number_of_shards': '5',

          // Deprecated settings
          'index.soft_deletes.enabled': 'true',
          'index.translog.retention.age': '5d',
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

  describe('sourceNameForIndex', () => {
    beforeEach(() => {
      versionService.setup(MAJOR_VERSION);
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
      versionService.setup(MAJOR_VERSION);
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

    if (currentMajor === 7) {
      describe('[7.x] customTypeName warning', () => {
        it('returns customTypeName warning for non-_doc mapping types', () => {
          expect(
            getReindexWarnings({
              settings: {},
              mappings: { doc: {} },
            })
          ).toEqual([
            {
              warningType: 'customTypeName',
              meta: {
                typeName: 'doc',
              },
            },
          ]);
        });
        it('does not return customTypeName warning for _doc mapping types', () => {
          expect(
            getReindexWarnings({
              settings: {},
              mappings: { _doc: {} },
            })
          ).toEqual([]);
        });
      });

      describe('[7.x] deprecatedSetting warning', () => {
        it('returns deprecatedSetting warning for deprecated index settings', () => {
          expect(
            getReindexWarnings({
              settings: {
                // Deprecated settings
                // @ts-expect-error @elastic/elasticsearch doesn't declare it
                'index.force_memory_term_dictionary': '1024',
                'index.max_adjacency_matrix_filters': 'true',
                'index.soft_deletes.enabled': 'true',
              },
              mappings: {},
            })
          ).toEqual([
            {
              warningType: 'indexSetting',
              meta: {
                deprecatedSettings: [
                  'index.force_memory_term_dictionary',
                  'index.max_adjacency_matrix_filters',
                  'index.soft_deletes.enabled',
                ],
              },
            },
          ]);
        });

        it('does not return a deprecatedSetting warning for there are no deprecated index settings', () => {
          expect(
            getReindexWarnings({
              settings: {
                // @ts-expect-error @elastic/elasticsearch doesn't declare it
                'index.number_of_replicas': '1',
              },
              mappings: {},
            })
          ).toEqual([]);
        });
      });
    }
  });
});
