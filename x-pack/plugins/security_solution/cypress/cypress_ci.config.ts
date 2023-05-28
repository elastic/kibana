/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudPlugin } from '@kbn/cypress';
import { v4 as uuid } from 'uuid';
import { defineConfig } from 'cypress';
import wp from '@cypress/webpack-preprocessor';
import { defineCypressConfig } from '@kbn/cypress-config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  defaultCommandTimeout: 150000,
  execTimeout: 150000,
  pageLoadTimeout: 150000,
  numTestsKeptInMemory: 0,
  retries: {
    runMode: 1,
  },
  screenshotsFolder: '../../../target/kibana-security-solution/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../target/kibana-security-solution/cypress/videos',
  viewportHeight: 946,
  viewportWidth: 1680,
  e2e: {
    baseUrl: 'http://localhost:5601',
    experimentalMemoryManagement: true,
    specPattern: '**/cypress/e2e/**/*.cy.ts',
    setupNodeEvents(on, config) {
      on('file:preprocessor', (file) => {
        const id = uuid();
        // Fix an issue with running Cypress parallel
        file.outputPath = file.outputPath.replace(/^(.*\/)(.*?)(\..*)$/, `$1$2.${id}$3`);

        return wp({
          webpackOptions: {
            resolve: {
              extensions: ['.ts', '.tsx', '.js'],
            },
            module: {
              rules: [
                {
                  test: /\.(js|tsx?)$/,
                  exclude: /node_modules/,
                  use: {
                    loader: 'babel-loader',
                    options: {
                      babelrc: false,
                      envName: 'development',
                      presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
                    },
                  },
                },
              ],
            },
          },
        })(file);
      });
      return cloudPlugin(on, config);
    },
  },
});
