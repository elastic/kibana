/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import type { ApmFields, SynthtraceGenerator } from '@kbn/apm-synthtrace-client';
import { opbeans } from '../fixtures/synthtrace/opbeans';
import { testData } from '../fixtures';

globalSetupHook('Ingest data to Elasticsearch', async ({ apmSynthtraceEsClient }) => {
  const dataGenerator: SynthtraceGenerator<ApmFields> = opbeans({
    from: new Date(testData.OPBEANS_START_DATE).getTime(),
    to: new Date(testData.OPBEANS_END_DATE).getTime(),
  });

  await apmSynthtraceEsClient.index(dataGenerator);
});
