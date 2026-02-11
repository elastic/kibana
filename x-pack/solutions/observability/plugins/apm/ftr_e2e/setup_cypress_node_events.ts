/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SynthtraceClientsManager, createLogger, LogLevel } from '@kbn/synthtrace';
import { createEsClientForTesting } from '@kbn/test';

import { initPlugin } from '@frsource/cypress-plugin-visual-regression-diff/plugins';
import { Readable } from 'stream';
import type { ApmSynthtracePipelines } from '@kbn/synthtrace-client';

export function setupNodeEvents(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  const logger = createLogger(LogLevel.info);

  const client = createEsClientForTesting({
    esUrl: config.env.ES_NODE,
    requestTimeout: config.env.ES_REQUEST_TIMEOUT,
    isCloud: !!config.env.TEST_CLOUD,
  });

  const clientsManager = new SynthtraceClientsManager({
    client,
    logger,
    refreshAfterIndex: true,
  });

  const { apmEsClient } = clientsManager.getClients({
    clients: ['apmEsClient'],
    packageVersion: config.env.APM_PACKAGE_VERSION,
  });

  initPlugin(on, config);

  on('task', {
    // send logs to node process
    log(message) {
      // eslint-disable-next-line no-console
      console.log(message);
      return null;
    },

    async 'synthtrace:index'({
      events,
      pipeline,
    }: {
      events: Array<Record<string, any>>;
      pipeline: ApmSynthtracePipelines;
    }) {
      await apmEsClient.index(
        Readable.from(events),
        apmEsClient.resolvePipelineType(pipeline, { includePipelineSerialization: false })
      );
      return null;
    },
    async 'synthtrace:clean'() {
      await apmEsClient.clean();
      return null;
    },
  });

  on('before:browser:launch', (browser, launchOptions) => {
    if (browser.name === 'electron' && browser.isHeadless) {
      launchOptions.preferences.width = 1440;
      launchOptions.preferences.height = 1600;
    }
    return launchOptions;
  });
}
