/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { resolve } = require('path');

const del = require('del');
const supportsColor = require('supports-color');
const { run, withProcRunner } = require('@kbn/dev-utils');

const ROOT_DIR = resolve(__dirname, '..');
const BUILD_DIR = resolve(ROOT_DIR, 'target');

const padRight = (width, str) =>
  str.length >= width ? str : `${str}${' '.repeat(width - str.length)}`;

run(
  async ({ log, flags }) => {
    await withProcRunner(log, async (proc) => {
      if (!flags.watch) {
        log.info('Deleting old output');
        await del(BUILD_DIR);
      }

      const cwd = ROOT_DIR;
      const env = { process };

      if (supportsColor.stdout) {
        env.FORCE_COLOR = 'true';
      }

      log.info(`Starting babel and typescript${flags.watch ? ' in watch mode' : ''}`);
      await proc.run(padRight(10, `babel`), {
        cmd: 'babel',
        args: [
          'src',
          '--config-file',
          require.resolve('../babel.config.js'),
          '--out-dir',
          BUILD_DIR,
          '--extensions',
          '.ts,.js,.tsx',
          '--copy-files',
          ...(flags.watch ? ['--watch'] : ['--quiet']),
        ],
        wait: true,
        env,
        cwd,
      });

      log.success('Complete');
    });
  },
  {
    description: 'Simple build tool for Canvas Storybook addon',
    flags: {
      boolean: ['watch'],
      help: `
        --watch            Run in watch mode
      `,
    },
  }
);
