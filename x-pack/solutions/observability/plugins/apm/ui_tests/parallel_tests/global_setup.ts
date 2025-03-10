/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { opbeans } from '../fixtures/synthtrace/opbeans';

globalSetupHook('Ingest data to Elasticsearch', async ({ apmSynthtraceEsClient }) => {
  const start = '2021-10-10T00:00:00.000Z';
  const end = '2021-10-10T00:15:00.000Z';
  const data = opbeans({
    from: new Date(start).getTime(),
    to: new Date(end).getTime(),
  });

  await apmSynthtraceEsClient.index(data);
});
