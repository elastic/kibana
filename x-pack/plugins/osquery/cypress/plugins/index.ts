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
// TODO: we should be able to remove this ts-ignore while using isolatedModules
// this is a skip for the errors created when typechecking with isolatedModules

// @ts-ignore

module.exports = (on: any, config: any) => {
  require('@cypress/grep/src/plugin')(config);

  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  return config;
};
