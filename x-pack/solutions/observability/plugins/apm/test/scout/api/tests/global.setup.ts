/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTests, globalSetupHook as obltGlobalSetupHook, tags } from '@kbn/scout-oblt';
import { synthtraceFixture } from '@kbn/scout-synthtrace';
import { ingestApmMetricsFixtures } from '../../shared';

const globalSetupHook = mergeTests(obltGlobalSetupHook, synthtraceFixture);

globalSetupHook(
  'Ingest APM metrics data for Scout API tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apmSynthtraceEsClient, log, esClient }) => {
    const startTime = Date.now();

    await ingestApmMetricsFixtures({ apmSynthtraceEsClient, esClient, log });

    log.info(`APM metrics data ingestion took ${Date.now() - startTime} ms`);
  }
);
