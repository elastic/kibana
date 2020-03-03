/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';
import path from 'path';
import { Field, processFields } from '../../fields/field';
import { generateMappings, getTemplate } from './template';

// Add our own serialiser to just do JSON.stringify
expect.addSnapshotSerializer({
  print(val) {
    return JSON.stringify(val, null, 2);
  },

  test(val) {
    return val;
  },
});

test('get template', () => {
  const templateName = 'logs-nginx-access-abcd';

  const template = getTemplate('logs', templateName, { properties: {} });
  expect(template.index_patterns).toStrictEqual([`${templateName}-*`]);
});

test('tests loading fields.yml', () => {
  // Load fields.yml file
  const ymlPath = path.join(__dirname, '../../fields/tests/base.yml');
  const fieldsYML = readFileSync(ymlPath, 'utf-8');
  const fields: Field[] = safeLoad(fieldsYML);

  processFields(fields);
  const mappings = generateMappings(fields);
  const template = getTemplate('logs', 'foo', mappings);

  expect(template).toMatchSnapshot(path.basename(ymlPath));
});
