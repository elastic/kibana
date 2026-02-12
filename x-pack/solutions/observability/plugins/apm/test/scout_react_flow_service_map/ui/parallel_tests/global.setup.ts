/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { opbeans } from '../fixtures/synthtrace/opbeans';
import { testData } from '../fixtures';

globalSetupHook(
  'Ingest data to Elasticsearch for React Flow Service Map tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apmSynthtraceEsClient, apiServices, log, config }) => {
    const startTime = Date.now();

    if (!config.isCloud) {
      await apiServices.fleet.internal.setup();
      log.info('Fleet infrastructure setup completed');
      await apiServices.fleet.agent.setup();
      log.info('Fleet agents setup completed');
    }

    const opbeansDataGenerator = opbeans({
      from: new Date(testData.START_DATE).getTime(),
      to: new Date(testData.END_DATE).getTime(),
    });

    await apmSynthtraceEsClient.index(opbeansDataGenerator);
    log.info(`APM data ingestion took ${Date.now() - startTime} ms`);
  }
);
