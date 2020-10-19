/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const fs = require('fs');
const del = require('del');
const { run } = require('@kbn/dev-utils');
// This is included in the main Kibana package.json
// eslint-disable-next-line import/no-extraneous-dependencies
const storybook = require('@storybook/react/standalone');
const execa = require('execa');
const { DLL_OUTPUT } = require('./../storybook/constants');

const storybookOptions = {
  configDir: path.resolve(__dirname, './../storybook'),
  mode: 'dev',
};

run(
  ({ log, flags }) => {
    const { addon, dll, clean, stats, site } = flags;

    // Delete the existing DLL if we're cleaning or building.
    if (clean || dll) {
      del.sync([DLL_OUTPUT], { force: true });

      if (clean) {
        return;
      }
    }

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
          'x-pack/plugins/canvas/storybook/webpack.dll.config.js',
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

    // Build the addon
    execa.sync('node', ['scripts/build'], {
      cwd: path.resolve(__dirname, '../storybook/addon'),
      stdio: ['ignore', 'inherit', 'inherit'],
      buffer: false,
    });

    // Build site and exit
    if (site) {
      log.success('storybook: Generating Storybook site');
      storybook({
        ...storybookOptions,
        mode: 'static',
        outputDir: path.resolve(__dirname, './../storybook/build'),
      });
      return;
    }

    log.info('storybook: Starting Storybook');

    if (addon) {
      execa('node', ['scripts/build', '--watch'], {
        cwd: path.resolve(__dirname, '../storybook/addon'),
        stdio: ['ignore', 'inherit', 'inherit'],
        buffer: false,
      });
    }

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
      boolean: ['addon', 'dll', 'clean', 'stats', 'site'],
      help: `
        --addon            Watch the addon source code for changes.
        --clean            Forces a clean of the Storybook DLL and exits.
        --dll              Cleans and builds the Storybook dependency DLL and exits.
        --stats            Produces a Webpack stats file.
        --site             Produces a site deployment of this Storybook.
      `,
    },
  }
);
