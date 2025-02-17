/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestSynthtraceDataHook } from '@kbn/scout';
import { type FullConfig } from '@playwright/test';
import { opbeans } from '../fixtures/synthtrace/opbeans';

async function globalSetup(config: FullConfig) {

    const start = '2021-10-10T00:00:00.000Z';
    const end = '2021-10-10T00:15:00.000Z';
    const data = {
        apm: [
          opbeans({
            from: new Date(start).getTime(),
            to: new Date(end).getTime(),
          }),
        ],
        infra: [
        // TODO add fixture 
        //   generateHosts({
        //     from: new Date(start).toISOString(),
        //     to: new Date(end).toISOString(),
        //   }),
        //   opbeans({
        //     from: new Date(start).getTime(),
        //     to: new Date(end).getTime(),
        //   }),
        ],
        otel: [
        // TODO add fixture 
        //   sendotlp({
        //     from: new Date(start).getTime(),
        //     to: new Date(end).getTime(),
        //   }),
        //   opbeans({
        //     from: new Date(start).getTime(),
        //     to: new Date(end).getTime(),
        //   }),
        ],
      };
    
    return ingestSynthtraceDataHook(config, data);
}

// eslint-disable-next-line import/no-default-export
export default globalSetup;