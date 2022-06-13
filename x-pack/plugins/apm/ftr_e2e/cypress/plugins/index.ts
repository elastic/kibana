/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  apm,
  createLogger,
  LogLevel,
  SpanArrayIterable,
} from '@elastic/apm-synthtrace';
import { createEsClientForTesting } from '@kbn/test';

// ***********************************************************
// This example plugins/index.ts can be used to load plugins
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
const plugin: Cypress.PluginConfig = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  const client = createEsClientForTesting({
    esUrl: config.env.ES_NODE,
    requestTimeout: config.env.ES_REQUEST_TIMEOUT,
    isCloud: !!config.env.TEST_CLOUD,
  });

  const forceDataStreams = false;
  const synthtraceEsClient = new apm.ApmSynthtraceEsClient(
    client,
    createLogger(LogLevel.info),
    forceDataStreams
  );

  on('task', {
    'synthtrace:index': async (events: Array<Record<string, any>>) => {
      await synthtraceEsClient.index(new SpanArrayIterable(events));
      return null;
    },
    'synthtrace:clean': async () => {
      await synthtraceEsClient.clean();
      return null;
    },
  });
};

module.exports = plugin;
