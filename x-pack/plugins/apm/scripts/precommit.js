/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console*/
/* eslint-disable import/no-extraneous-dependencies*/

const execa = require('execa');
const Listr = require('listr');
const { resolve } = require('path');

const cwd = resolve(__dirname, '../../../..');

const execaOpts = { cwd, stderr: 'inherit' };

const tasks = new Listr(
  [
    {
      title: 'Jest',
      task: () =>
        execa(
          'node',
          [
            resolve(__dirname, './jest.js'),
            '--reporters',
            resolve(__dirname, '../../../../node_modules/jest-silent-reporter'),
            '--collect-coverage',
            'false',
          ],
          execaOpts
        ),
    },
    {
      title: 'Typescript',
      task: () =>
        execa(
          require.resolve('typescript/bin/tsc'),
          ['--project', resolve(__dirname, '../tsconfig.json'), '--pretty'],
          execaOpts
        ),
    },
    {
      title: 'Lint',
      task: () => execa('node', [resolve(__dirname, 'eslint.js')], execaOpts),
    },
  ],
  { exitOnError: false, concurrent: true }
);

tasks.run().catch((error) => {
  // from src/dev/typescript/exec_in_projects.ts
  process.exitCode = 1;
  const errors = error.errors || [error];

  for (const e of errors) {
    process.stderr.write(e.stderr || e.stdout);
  }
});
