/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTests, globalSetupHook as obltGlobalSetupHook, tags } from '@kbn/scout-oblt';
import { synthtraceFixture } from '@kbn/scout-synthtrace';
import { ingestApmMetricsFixtures } from '../../shared';
import {
  serviceMapStats,
  SERVICE_MAP_STATS_END_DATE,
  SERVICE_MAP_STATS_START_DATE,
} from '../fixtures/synthtrace/service_map_stats';

const globalSetupHook = mergeTests(obltGlobalSetupHook, synthtraceFixture);

globalSetupHook(
  'Ingest APM data for Scout API tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apmSynthtraceEsClient, log, esClient }) => {
    const startTime = Date.now();

    await ingestApmMetricsFixtures({ apmSynthtraceEsClient, esClient, log });

    await apmSynthtraceEsClient.index(
      serviceMapStats({
        from: new Date(SERVICE_MAP_STATS_START_DATE).getTime(),
        to: new Date(SERVICE_MAP_STATS_END_DATE).getTime(),
      })
    );
    log.info('Service map stats data indexed');

    log.info(`APM data ingestion took ${Date.now() - startTime} ms`);
  }
);
