/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync } from 'fs';
import glob from 'glob';
import { safeLoad } from 'js-yaml';
import path from 'path';
import { Field, Fields, getField, processFields } from './field';

// Add our own serialiser to just do JSON.stringify
expect.addSnapshotSerializer({
  print(val) {
    return JSON.stringify(val, null, 2);
  },

  test(val) {
    return val;
  },
});

test('tests loading fields.yml', () => {
  // Find all .yml files to run tests on
  const files = glob.sync(path.join(__dirname, '/tests/*.yml'));
  for (const file of files) {
    const fieldsYML = readFileSync(file, 'utf-8');
    const fields: Field[] = safeLoad(fieldsYML);
    const processedFields = processFields(fields);

    // Check that content file and generated file are equal
    expect(processedFields).toMatchSnapshot(path.basename(file));
  }
});

describe('getField searches recursively for nested field in fields given an array of path parts', () => {
  const searchFields: Fields = [
    {
      name: '1',
      fields: [
        {
          name: '1-1',
        },
        {
          name: '1-2',
        },
      ],
    },
    {
      name: '2',
      fields: [
        {
          name: '2-1',
        },
        {
          name: '2-2',
          fields: [
            {
              name: '2-2-1',
            },
            {
              name: '2-2-2',
            },
          ],
        },
      ],
    },
  ];
  test('returns undefined when the field does not exist', () => {
    expect(getField(searchFields, ['0'])).toBe(undefined);
  });
  test('returns undefined if the field is not a leaf node', () => {
    expect(getField(searchFields, ['1'])?.name).toBe(undefined);
  });
  test('returns undefined searching for a nested field that does not exist', () => {
    expect(getField(searchFields, ['1', '1-3'])?.name).toBe(undefined);
  });
  test('returns nested field that is a leaf node', () => {
    expect(getField(searchFields, ['2', '2-2', '2-2-1'])?.name).toBe('2-2-1');
  });
});
