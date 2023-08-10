/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const oldHeadless = (on: Cypress.PluginEvents) => {
  on('before:browser:launch', (browser, launchOptions) => {
    if (browser?.name === 'chrome' && browser?.isHeadless) {
      launchOptions.args = launchOptions.args.map((arg) => {
        if (arg === '--headless=new') {
          return '--headless';
        }

        return arg;
      });
    }

    return launchOptions;
  });
};
