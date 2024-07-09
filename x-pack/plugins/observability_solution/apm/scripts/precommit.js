/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console*/
/* eslint-disable import/no-extraneous-dependencies*/

const execa = require('execa');
const { Listr } = require('listr2');
const { resolve } = require('path');

const root = resolve(__dirname, '../../../..');

const execaOpts = { cwd: root, stderr: 'pipe' };

const tsconfig = resolve(root, 'x-pack/plugins/observability_solution/apm/tsconfig.json');

const testTsconfig = resolve(root, 'x-pack/test/tsconfig.json');

const tasks = new Listr(
  [
    {
      title: 'Lint',
      task: () => execa('node', [resolve(__dirname, 'eslint.js')], execaOpts),
    },
    {
      title: 'Typescript',
      task: async () => {
        await execa('node', [
          resolve(__dirname, '../../../../scripts/type_check.js'),
          '--project',
          tsconfig,
        ]);
        await execa('node', [
          resolve(__dirname, '../../../../scripts/type_check.js'),
          '--project',
          testTsconfig,
        ]);
      },
    },
    {
      title: 'Jest',
      task: () =>
        execa(
          'node',
          [
            resolve(__dirname, '../../../../scripts/jest.js'),
            '--config',
            resolve(__dirname, '../jest.config.js'),
            '--maxWorkers',
            4,
          ],
          execaOpts
        ),
    },
  ],
  {
    exitOnError: true,
    concurrent: false,
    renderer: process.env.CI ? 'verbose' : 'default',
  }
);

tasks.run().catch((error) => {
  // from src/dev/typescript/exec_in_projects.ts
  process.exitCode = 1;
  const errors = error.errors || [error];

  for (const e of errors) {
    process.stderr.write(e.stderr || e.stdout);
  }
});
