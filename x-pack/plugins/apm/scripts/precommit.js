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
const { argv } = require('yargs');

const root = resolve(__dirname, '../../../..');

const execaOpts = { cwd: root, stderr: 'pipe' };

const useOptimizedTsConfig = !!argv.optimizeTs;

const tsconfig = useOptimizedTsConfig
  ? resolve(root, 'tsconfig.json')
  : resolve(root, 'x-pack/plugins/apm/tsconfig.json');

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
          'node',
          [
            resolve(
              __dirname,
              useOptimizedTsConfig
                ? './optimize-tsconfig.js'
                : './unoptimize-tsconfig.js'
            ),
          ],
          execaOpts
        ).then(() =>
          execa(
            require.resolve('typescript/bin/tsc'),
            [
              '--project',
              tsconfig,
              '--pretty',
              ...(useOptimizedTsConfig ? ['--noEmit'] : []),
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
  { exitOnError: true, concurrent: true }
);

tasks.run().catch((error) => {
  // from src/dev/typescript/exec_in_projects.ts
  process.exitCode = 1;
  const errors = error.errors || [error];

  for (const e of errors) {
    process.stderr.write(e.stderr || e.stdout);
  }
});
