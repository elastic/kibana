/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findBooleanFields, getReindexWarnings, transformFlatSettings } from './index_settings';
import { ReindexWarning } from './types';

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
          'index.routing.allocation.initial_recovery._id': '1',
          'index.version.created': '123123',
          'index.version.upgraded': '123123',
          'index.provided_name': 'test1',
          'index.legacy': '6',
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

  it('does not allow indices with _all.enablead = true', () => {
    expect(() => {
      transformFlatSettings({
        settings: {},
        mappings: {
          myType: {
            _all: { enabled: true },
          },
        },
      });
    }).toThrowError(`Mapping types with _all.enabled are not supported in 7.0`);
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
