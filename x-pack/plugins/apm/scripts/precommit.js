/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console*/
/* eslint-disable import/no-extraneous-dependencies*/

const execa = require('execa');
const Listr = require('listr');
const { resolve } = require('path');

const cwd = resolve(__dirname, '../../../..');

const execaOpts = { cwd, stderr: 'pipe' };

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
        execa('node', [resolve(__dirname, 'optimize-tsconfig.js')]).then(() =>
          execa(
            require.resolve('typescript/bin/tsc'),
            [
              '--project',
              resolve(__dirname, '../../../tsconfig.json'),
              '--pretty',
              '--noEmit',
              '--skipLibCheck',
            ],
            execaOpts
          )
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
    process.stderr.write(e.stdout);
  }
});
