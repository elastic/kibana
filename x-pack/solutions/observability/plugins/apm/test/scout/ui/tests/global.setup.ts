/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTests, globalSetupHook as obltGlobalSetupHook, tags } from '@kbn/scout-oblt';
import { synthtraceFixture } from '@kbn/scout-synthtrace';
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { opbeans } from '../fixtures/synthtrace/opbeans';
import { testData } from '../fixtures';

const globalSetupHook = mergeTests(obltGlobalSetupHook, synthtraceFixture);

// The sequential lane only needs the opbeans dataset: it backs the data-dependent
// assertions in `navigation/home.spec.ts`. The `no_data_screen` and `comparison`
// suites don't rely on ingested data.
globalSetupHook(
  'Ingest APM data to Elasticsearch',
  { tag: [...tags.stateful.classic] },
  async ({ apmSynthtraceEsClient, log }) => {
    const opbeansDataGenerator: SynthtraceGenerator<ApmFields> = opbeans({
      from: new Date(testData.START_DATE).getTime(),
      to: new Date(testData.END_DATE).getTime(),
    });

    await apmSynthtraceEsClient.index(opbeansDataGenerator);
    log.info('APM opbeans data indexed for the sequential UI lane');
  }
);
