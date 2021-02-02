/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

  it('excludes appended v5 reindexing string from newIndexName', () => {
    expect(sourceNameForIndex('myIndex-reindexed-v5')).toEqual('myIndex');
    expect(sourceNameForIndex('.myInternalIndex-reindexed-v5')).toEqual('.myInternalIndex');
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

  it('excludes appended v5 reindexing string from generateNewIndexName', () => {
    expect(generateNewIndexName('myIndex-reindexed-v5')).toEqual(
      `reindexed-v${currentMajor}-myIndex`
    );

    expect(generateNewIndexName('.myInternalIndex-reindexed-v5')).toEqual(
      `.reindexed-v${currentMajor}-myInternalIndex`
    );
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
