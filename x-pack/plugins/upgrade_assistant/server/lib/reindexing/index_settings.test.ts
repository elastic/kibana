/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CURRENT_MAJOR_VERSION,
  PREV_MAJOR_VERSION,
} from 'x-pack/plugins/upgrade_assistant/common/version';
import { getReindexWarnings, parseIndexName, transformFlatSettings } from './index_settings';

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
          'index.uuid': 'i66b9149a-00ee-42d9-8ca1-85ae927924bf',
          'index.blocks.write': 'true',
          'index.creation_date': '1547052614626',
          'index.legacy': '6',
          'index.mapping.single_type': 'true',
          'index.provided_name': 'test1',
          'index.routing.allocation.initial_recovery._id': '1',
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
});

describe('parseIndexName', () => {
  it('parses internal indices', () => {
    expect(parseIndexName('.watches').baseName).toBe('watches');
  });

  it('parses non-internal indices', () => {
    expect(parseIndexName('myIndex').baseName).toBe('myIndex');
  });

  it('excludes appended v5 reindexing string from newIndexName', () => {
    expect(parseIndexName('myIndex-reindexed-v5')).toEqual({
      baseName: 'myIndex-reindexed-v5',
      cleanBaseName: 'myIndex',
      cleanIndexName: 'myIndex',
      newIndexName: `reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`,
    });

    expect(parseIndexName('.myInternalIndex-reindexed-v5')).toEqual({
      baseName: 'myInternalIndex-reindexed-v5',
      cleanBaseName: 'myInternalIndex',
      cleanIndexName: '.myInternalIndex',
      newIndexName: `.reindexed-v${CURRENT_MAJOR_VERSION}-myInternalIndex`,
    });
  });

  it('replaces reindexed-v${PREV_MAJOR_VERSION} with reindexed-v${CURRENT_MAJOR_VERSION} in newIndexName', () => {
    expect(parseIndexName(`reindexed-v${PREV_MAJOR_VERSION}-myIndex`)).toEqual({
      baseName: `reindexed-v${PREV_MAJOR_VERSION}-myIndex`,
      cleanBaseName: 'myIndex',
      cleanIndexName: 'myIndex',
      newIndexName: `reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`,
    });

    expect(parseIndexName(`.reindexed-v${PREV_MAJOR_VERSION}-myInternalIndex`)).toEqual({
      baseName: `reindexed-v${PREV_MAJOR_VERSION}-myInternalIndex`,
      cleanBaseName: 'myInternalIndex',
      cleanIndexName: '.myInternalIndex',
      newIndexName: `.reindexed-v${CURRENT_MAJOR_VERSION}-myInternalIndex`,
    });
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
