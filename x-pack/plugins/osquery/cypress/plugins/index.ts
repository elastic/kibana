/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// / <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
module.exports = (on: any, config: any) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-extraneous-dependencies
  require('@cypress/code-coverage/task')(on, config);

  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  return config;
};
