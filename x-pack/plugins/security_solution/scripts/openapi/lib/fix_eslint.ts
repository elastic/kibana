/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { resolve } from 'path';

const KIBANA_ROOT = resolve(__dirname, '../../../../../../');

export async function fixEslint(path: string) {
  await execa('npx', ['eslint', '--fix', path], {
    // Need to run eslint from the Kibana root directory, otherwise it will not
    // be able to pick up the right config
    cwd: KIBANA_ROOT,
  });
}
