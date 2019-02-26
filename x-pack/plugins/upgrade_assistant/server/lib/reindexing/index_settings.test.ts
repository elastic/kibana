/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CURRENT_MAJOR_VERSION,
  NEXT_MAJOR_VERSION,
  PREV_MAJOR_VERSION,
} from 'x-pack/plugins/upgrade_assistant/common/version';
import { ReindexWarning } from '../../../common/types';
import {
  findBooleanFields,
  generateNewIndexName,
  getReindexWarnings,
  sourceNameForIndex,
  transformFlatSettings,
} from './index_settings';

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

  it('fixes negative values of delayed_timeout', () => {
    expect(
      transformFlatSettings({
        settings: {
          'index.unassigned.node_left.delayed_timeout': '-10',
        },
        mappings: {},
      })
    ).toEqual({
      settings: {
        'index.unassigned.node_left.delayed_timeout': '0',
      },
      mappings: {},
    });
  });

  it('does not allow index.shard.check_on_startup to be set to "fix"', () => {
    expect(() =>
      transformFlatSettings({
        settings: {
          'index.shard.check_on_startup': 'fix',
        },
        mappings: {},
      })
    ).toThrowError(`index.shard.check_on_startup cannot be set to 'fix'`);
  });

  it('does not allow index.percolator.map_unmapped_fields_as_string to be set', () => {
    expect(() =>
      transformFlatSettings({
        settings: {
          'index.percolator.map_unmapped_fields_as_string': 'blah',
        },
        mappings: {},
      })
    ).toThrowError(`index.percolator.map_unmapped_fields_as_string is no longer supported.`);
  });

  it('removes _default_ mapping types', () => {
    expect(
      transformFlatSettings({
        settings: {},
        mappings: {
          _default_: {},
          myType: {},
        },
      })
    ).toEqual({
      settings: {},
      mappings: {
        myType: {},
      },
    });
  });

  it('does not allow multiple mapping types', () => {
    expect(() =>
      transformFlatSettings({
        settings: {},
        mappings: {
          myType1: {},
          myType2: {},
        },
      })
    ).toThrowError(`Indices with more than one mapping type are not supported in 7.0.`);
  });

  it('removes _all.enablead = false', () => {
    expect(
      transformFlatSettings({
        settings: {},
        mappings: {
          myType: {
            _all: { enabled: false },
          },
        },
      })
    ).toEqual({
      settings: {},
      mappings: {
        myType: {},
      },
    });
  });

  it('removes _all.enablead = true', () => {
    expect(
      transformFlatSettings({
        settings: {},
        mappings: {
          myType: {
            _all: { enabled: true },
          },
        },
      })
    ).toEqual({
      settings: {},
      mappings: {
        myType: {},
      },
    });
  });
});

describe('sourceNameForIndex', () => {
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

  it('replaces reindexed-v${PREV_MAJOR_VERSION} with reindexed-v${CURRENT_MAJOR_VERSION} in newIndexName', () => {
    expect(sourceNameForIndex(`reindexed-v${PREV_MAJOR_VERSION}-myIndex`)).toEqual('myIndex');
    expect(sourceNameForIndex(`.reindexed-v${PREV_MAJOR_VERSION}-myInternalIndex`)).toEqual(
      '.myInternalIndex'
    );
  });

  it('parses security index', () => {
    expect(sourceNameForIndex('.security-6')).toEqual('.security');
    expect(sourceNameForIndex('.security-7')).toEqual('.security');
    expect(sourceNameForIndex('.security')).toEqual('.security');
  });
});

describe('generateNewIndexName', () => {
  it('parses internal indices', () => {
    expect(generateNewIndexName('.myInternalIndex')).toEqual(
      `.reindexed-v${CURRENT_MAJOR_VERSION}-myInternalIndex`
    );
  });

  it('parses non-internal indices', () => {
    expect(generateNewIndexName('myIndex')).toEqual(`reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`);
  });

  it('excludes appended v5 reindexing string from generateNewIndexName', () => {
    expect(generateNewIndexName('myIndex-reindexed-v5')).toEqual(
      `reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`
    );

    expect(generateNewIndexName('.myInternalIndex-reindexed-v5')).toEqual(
      `.reindexed-v${CURRENT_MAJOR_VERSION}-myInternalIndex`
    );
  });

  it('replaces reindexed-v${PREV_MAJOR_VERSION} with reindexed-v${CURRENT_MAJOR_VERSION} in generateNewIndexName', () => {
    expect(generateNewIndexName(`reindexed-v${PREV_MAJOR_VERSION}-myIndex`)).toEqual(
      `reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`
    );

    expect(generateNewIndexName(`.reindexed-v${PREV_MAJOR_VERSION}-myInternalIndex`)).toEqual(
      `.reindexed-v${CURRENT_MAJOR_VERSION}-myInternalIndex`
    );
  });

  it('maintains security naming convention when aleady re-indexed', () => {
    expect(generateNewIndexName(`.security-${CURRENT_MAJOR_VERSION}`)).toEqual(
      `.security-${NEXT_MAJOR_VERSION}`
    );
  });

  it('maintains security naming convention', () => {
    expect(generateNewIndexName(`.security`)).toEqual(`.security-${NEXT_MAJOR_VERSION}`);
  });
});

describe('getReindexWarnings', () => {
  it('fails if there are multiple mapping types', () => {
    expect(() =>
      getReindexWarnings({
        settings: {},
        mappings: {
          myType1: {},
          myType2: {},
        },
      })
    ).toThrowError();
  });

  it('does not fail if there is a _default_ mapping', () => {
    expect(
      getReindexWarnings({
        settings: {},
        mappings: {
          _default_: {},
          myType1: {},
        },
      })
    ).toEqual([]);
  });

  it('does not blow up for empty mappings', () => {
    expect(
      getReindexWarnings({
        settings: {},
        mappings: {},
      })
    ).toEqual([]);
  });

  it('returns allField if has _all in mapping type', () => {
    expect(
      getReindexWarnings({
        settings: {},
        mappings: {
          myType: {
            _all: { enabled: true },
          },
        },
      })
    ).toEqual([ReindexWarning.allField]);
  });

  it('returns booleanFields if mapping type has any boolean fields', () => {
    expect(
      getReindexWarnings({
        settings: {},
        mappings: {
          myType: {
            properties: {
              field1: { type: 'boolean' },
            },
          },
        },
      })
    ).toEqual([ReindexWarning.booleanFields]);
  });
});

describe('findBooleanFields', () => {
  it('returns nested fields', () => {
    const mappingProperties = {
      region: {
        type: 'boolean',
      },
      manager: {
        properties: {
          age: { type: 'boolean' },
          name: {
            properties: {
              first: { type: 'text' },
              last: { type: 'boolean' },
            },
          },
        },
      },
    };

    expect(findBooleanFields(mappingProperties)).toEqual([
      ['region'],
      ['manager', 'age'],
      ['manager', 'name', 'last'],
    ]);
  });
});
