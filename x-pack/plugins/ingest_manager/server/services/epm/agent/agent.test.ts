/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import * as yaml from 'js-yaml';
import path from 'path';
import { createInput } from './agent';

test('test converting input and manifest into template', () => {
  const manifest = yaml.safeLoad(
    fs.readFileSync(path.join(__dirname, 'tests/manifest.yml'), 'utf8')
  );

  const inputTemplate = fs.readFileSync(path.join(__dirname, 'tests/input.yml'), 'utf8');
  const output = createInput(manifest.vars, inputTemplate);

  // Golden file path
  const generatedFile = path.join(__dirname, './tests/input.generated.yaml');

  // Regenerate the file if `-generate` flag is used
  if (process.argv.includes('-generate')) {
    fs.writeFileSync(generatedFile, output);
  }

  const outputData = fs.readFileSync(generatedFile, 'utf-8');

  // Check that content file and generated file are equal
  expect(outputData).toBe(output);
});
