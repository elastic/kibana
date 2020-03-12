/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync } from 'fs';
import glob from 'glob';
import { safeLoad } from 'js-yaml';
import path from 'path';
import { Field, processFields } from './field';

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
