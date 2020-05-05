/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const fs = require('fs');
const del = require('del');
const { run } = require('@kbn/dev-utils');
const storybook = require('@storybook/react/standalone');
const execa = require('execa');
const { DLL_OUTPUT } = require('./../.storybook/constants');

const options = {
  stdio: ['ignore', 'inherit', 'inherit'],
  buffer: false,
};

const storybookOptions = {
  configDir: path.resolve(__dirname, './../.storybook'),
  mode: 'dev',
};

run(
  ({ log, flags }) => {
    const { dll, clean, stats, site } = flags;

    // Delete the existing DLL if we're cleaning or building.
    if (clean || dll) {
      del.sync([DLL_OUTPUT], { force: true });

      if (clean) {
        return;
      }
    }

    // Ensure SASS dependencies have been built before doing anything.
    execa.sync(process.execPath, ['scripts/build_sass'], {
      cwd: path.resolve(__dirname, '../../../..'),
      ...options,
    });

    // Build the DLL if necessary.
    if (fs.existsSync(DLL_OUTPUT)) {
      log.info('storybook: DLL exists from previous build; skipping');
    } else {
      log.info('storybook: Building DLL');
      execa.sync(
        'yarn',
        [
          'webpack',
          '--config',
          'x-pack/plugins/canvas/.storybook/webpack.dll.config.js',
          '--progress',
          '--hide-modules',
          '--display-entrypoints',
          'false',
        ],
        {
          cwd: path.resolve(__dirname, '../../../..'),
          stdio: ['ignore', 'inherit', 'inherit'],
          buffer: false,
        }
      );
      log.success('storybook: DLL built');
    }

    // If we're only building the DLL, we're done.
    if (dll) {
      return;
    }

    // Build statistics and exit
    if (stats) {
      log.success('storybook: Generating Storybook statistics');
      storybook({
        ...storybookOptions,
        smokeTest: true,
      });
      return;
    }

    // Build site and exit
    if (site) {
      log.success('storybook: Generating Storybook site');
      storybook({
        ...storybookOptions,
        mode: 'static',
        outputDir: path.resolve(__dirname, './../storybook'),
      });
      return;
    }

    log.info('storybook: Starting Storybook');

    // Watch the SASS sheets for changes
    execa(process.execPath, ['scripts/build_sass', '--watch'], {
      cwd: path.resolve(__dirname, '../../../..'),
      ...options,
    });

    storybook({
      ...storybookOptions,
      port: 9001,
    });
  },
  {
    description: `
      Storybook runner for Canvas.
    `,
    flags: {
      boolean: ['dll', 'clean', 'stats', 'site'],
      help: `
        --clean            Forces a clean of the Storybook DLL and exits.
        --dll              Cleans and builds the Storybook dependency DLL and exits.
        --stats            Produces a Webpack stats file.
        --site             Produces a site deployment of this Storybook.
      `,
    },
  }
);
