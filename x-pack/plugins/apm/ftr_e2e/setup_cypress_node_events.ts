/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  apmDefaults,
  createLogger,
  SignalArray,
  LogLevel,
  StreamProcessor,
  ApmFields,
  SynthtraceEsClient,
  SerializedSignal,
  SignalTransferObject,
} from '@kbn/apm-synthtrace';
import { createEsClientForTesting } from '@kbn/test';
import { some } from 'lodash';
import del from 'del';

export function setupNodeEvents(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) {
  const client = createEsClientForTesting({
    esUrl: config.env.ES_NODE,
    requestTimeout: config.env.ES_REQUEST_TIMEOUT,
    isCloud: !!config.env.TEST_CLOUD,
  });

  const logger = createLogger(LogLevel.info);
  const streamProcessor = new StreamProcessor<ApmFields>({
    logger,
    processors: apmDefaults.processors,
    streamAggregators: apmDefaults.streamAggregators,
  });
  const synthtraceEsClient = new SynthtraceEsClient(client, logger, {
    refreshAfterIndex: true,
    streamProcessor,
  });

  on('task', {
    // send logs to node process
    log(message) {
      // eslint-disable-next-line no-console
      console.log(message);
      return null;
    },
    'synthtrace:index': async (events: SerializedSignal[]) => {
      await synthtraceEsClient.index(
        new SignalArray(events.map((e) => new SignalTransferObject(e)))
      );
      return null;
    },
    'synthtrace:clean': async () => {
      await synthtraceEsClient.clean(apmDefaults.writeTargets);
      return null;
    },
  });

  on('after:spec', (spec, results) => {
    // Delete videos that have no failures or retries
    if (results && results.video) {
      const failures = some(results.tests, (test) => {
        return some(test.attempts, { state: 'failed' });
      });
      if (!failures) {
        del(results.video);
      }
    }
  });

  on('before:browser:launch', (browser, launchOptions) => {
    if (browser.name === 'electron' && browser.isHeadless) {
      launchOptions.preferences.width = 1440;
      launchOptions.preferences.height = 1600;
    }
    return launchOptions;
  });
}
