/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractFields } from './extract_fields';
describe('extractFields()', () => {
  it('should just work', () => {
    const doc = {
      level1: {
        level2String: 'test',
        level2Array: ['test'],
        level2: {
          level3: {
            level4Null: null,
            level4Number: 1,
          },
        },
      },
    };
    expect(extractFields(doc, [], ['level1.level2String'])).toEqual([
      'level1.level2String',
      'level1.level2Array',
      'level1.level2.level3.level4Null',
      'level1.level2.level3.level4Number',
    ]);
  });
});
