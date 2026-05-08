/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTests, globalSetupHook as obltGlobalSetupHook, tags } from '@kbn/scout-oblt';
import { synthtraceFixture } from '@kbn/scout-synthtrace';
import {
  metricsServices,
  setupOtelNativeJavaMetrics,
} from '../../ui/fixtures/synthtrace/metrics_services';
import { awsLambda } from '../../ui/fixtures/synthtrace/aws_lambda';
import { testData } from '../fixtures';

const globalSetupHook = mergeTests(obltGlobalSetupHook, synthtraceFixture);

globalSetupHook(
  'Ingest APM metrics data for Scout API tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apmSynthtraceEsClient, log, esClient }) => {
    const startTime = Date.now();
    const startMs = new Date(testData.START_DATE).getTime();
    const endMs = new Date(testData.END_DATE).getTime();

    await apmSynthtraceEsClient.index(metricsServices({ from: startMs, to: endMs }));
    log.info('APM metrics services data indexed');

    await apmSynthtraceEsClient.index(awsLambda({ from: startMs, to: endMs }));
    log.info('AWS Lambda services data indexed');

    await setupOtelNativeJavaMetrics(esClient, startMs, endMs);
    log.info('OTel-native Java metrics bulk-indexed into .otel-* indices');

    log.info(`APM metrics data ingestion took ${Date.now() - startTime} ms`);
  }
);
