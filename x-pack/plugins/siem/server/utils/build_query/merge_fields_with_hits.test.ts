/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mergeFieldsWithHit } from './merge_fields_with_hits';

describe('events elasticsearch_adapter', () => {
  const mockFieldMap: Readonly<Record<string, string>> = {
    firstSeen: '@timestamp',
    name: 'system.host.name',
    os: 'system.host.os.name',
    version: 'system.host.os.version',
    'level1.value1': 'someLevel1.someLevel2.someKey1',
    'level1.value2': 'someLevel1.someLevel2.someKey2',
    'level2.value2.value3': 'someLevel1.someLevel2.someLevel3.someKey3',
    'level2.value2.value4': 'someLevel1.someLevel2.someLevel3.someKey4',
    'level2.value2.value5': 'someLevel1.someLevel2.someLevel3.someLevel4.someKey5',
    'level2.value2.value6': 'someLevel1.someLevel2.someLevel3.someLevel4.someKey6',
  };

  const mockHits = {
    _source: {
      system: {
        host: {
          name: 'host-1',
          os: {
            name: 'os-1',
            version: 'version-1',
          },
        },
      },
      someLevel1: {
        someLevel2: {
          someKey1: 'level-2-value-1',
          someKey2: 'level-2-value-2',
          someLevel3: {
            someKey3: 'level-3-value-3',
            someKey4: 'level-3-value-4',
            someLevel4: {
              someKey5: 'level-4-value-5',
              someKey6: 'level-4-value-6',
            },
          },
        },
      },
    },
  };

  test('it should merge two fields correctly', () => {
    const existing = { node: {} };
    const merge1 = mergeFieldsWithHit('os', existing, mockFieldMap, mockHits);
    const merge2 = mergeFieldsWithHit('version', merge1, mockFieldMap, mockHits);
    expect(merge2).toEqual({ node: { os: 'os-1', version: 'version-1' } });
  });

  test('it should merge two fields correctly with values', () => {
    const existing = { node: {} };
    const merge1 = mergeFieldsWithHit('level1.value1', existing, mockFieldMap, mockHits);
    const merge2 = mergeFieldsWithHit('level1.value2', merge1, mockFieldMap, mockHits);
    expect(merge2).toEqual({
      node: {
        level1: {
          value1: 'level-2-value-1',
          value2: 'level-2-value-2',
        },
      },
    });
  });

  test('it should merge two fields correctly along side of other fields', () => {
    const existing = { node: {} };
    const merge1 = mergeFieldsWithHit('os', existing, mockFieldMap, mockHits);
    const merge2 = mergeFieldsWithHit('version', merge1, mockFieldMap, mockHits);
    const merge3 = mergeFieldsWithHit('level1.value1', merge2, mockFieldMap, mockHits);
    const merge4 = mergeFieldsWithHit('level1.value2', merge3, mockFieldMap, mockHits);
    expect(merge4).toEqual({
      node: {
        os: 'os-1',
        version: 'version-1',
        level1: {
          value1: 'level-2-value-1',
          value2: 'level-2-value-2',
        },
      },
    });
  });

  test('it should merge deep leveled 3 fields with other fields', () => {
    const existing = { node: {} };
    const merge1 = mergeFieldsWithHit('os', existing, mockFieldMap, mockHits);
    const merge2 = mergeFieldsWithHit('version', merge1, mockFieldMap, mockHits);
    const merge3 = mergeFieldsWithHit('level2.value2.value3', merge2, mockFieldMap, mockHits);
    expect(merge3).toEqual({
      node: {
        level2: {
          value2: {
            value3: 'level-3-value-3',
          },
        },
        os: 'os-1',
        version: 'version-1',
      },
    });
  });

  test('it should merge deep level 4 leveled fields with other fields', () => {
    const existing = { node: {} };
    const merge1 = mergeFieldsWithHit('os', existing, mockFieldMap, mockHits);
    const merge2 = mergeFieldsWithHit('version', merge1, mockFieldMap, mockHits);
    const merge3 = mergeFieldsWithHit('level2.value2.value5', merge2, mockFieldMap, mockHits);
    const merge4 = mergeFieldsWithHit('level2.value2.value6', merge3, mockFieldMap, mockHits);
    expect(merge4).toEqual({
      node: {
        level2: {
          value2: {
            value5: 'level-4-value-5',
            value6: 'level-4-value-6',
          },
        },
        os: 'os-1',
        version: 'version-1',
      },
    });
  });
});
