/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import Url from 'url';
import { run as playwrightRun } from '@elastic/synthetics';
import { esArchiverLoad, esArchiverUnload } from './tasks/es_archiver';

import './journeys';

export function playwrightRunTests() {
  return async ({ getService }: any) => {
    try {
      const result = await playwrightStart(getService);

      if (result && result.uptime.status !== 'succeeded') {
        process.exit(1);
      }
    } catch (error) {
      console.error('errors: ', error);
      process.exit(1);
    }
  };
}

async function playwrightStart(getService: any) {
  console.log('Loading esArchiver...');
  await esArchiverLoad('full_heartbeat');

  const config = getService('config');

  const kibanaUrl = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
  });

  const res = await playwrightRun({
    params: { kibanaUrl },
    playwrightOptions: { chromiumSandbox: false, timeout: 60 * 1000 },
  });

  console.log('Removing esArchiver...');
  await esArchiverUnload('full_heartbeat');

  return res;
}
