/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Fs from 'fs';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { apm, createLogger, LogLevel } from '@elastic/apm-synthtrace';
import { CA_CERT_PATH } from '@kbn/dev-utils';

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

  const node = config.env.ES_NODE;
  const requestTimeout = config.env.ES_REQUEST_TIMEOUT;
  const isCloud = config.env.TEST_CLOUD;

  const client = new Client({
    node,
    requestTimeout,
    Connection: HttpConnection,
    ...(isCloud ? { tls: { ca: Fs.readFileSync(CA_CERT_PATH, 'utf-8') } } : {}),
  });

  const synthtraceEsClient = new apm.ApmSynthtraceEsClient(
    client,
    createLogger(LogLevel.info)
  );

  on('task', {
    'synthtrace:index': async (events) => {
      await synthtraceEsClient.index(events);
      return null;
    },
    'synthtrace:clean': async () => {
      await synthtraceEsClient.clean();
      return null;
    },
  });
};

module.exports = plugin;
