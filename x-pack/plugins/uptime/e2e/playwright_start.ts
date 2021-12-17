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

export function playwrightRunTests({ headless, match }: { headless: boolean; match?: string }) {
  return async ({ getService }: any) => {
    const result = await playwrightStart(getService, headless, match);

    if (
      result?.uptime &&
      result.uptime.status !== 'succeeded' &&
      result.StepsDuration &&
      result.StepsDuration.status !== 'succeeded'
    ) {
      throw new Error('Tests failed');
    }
  };
}

async function playwrightStart(getService: any, headless = true, match?: string) {
  console.log('Loading esArchiver...');
  const esArchiver = getService('esArchiver');

  esArchiverLoad('full_heartbeat');
  esArchiverLoad('browser');

  const config = getService('config');

  await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

  const kibanaUrl = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
  });

  const res = await playwrightRun({
    params: { kibanaUrl },
    playwrightOptions: { headless, chromiumSandbox: false, timeout: 60 * 1000 },
    match: match === 'undefined' ? '' : match,
  });

  console.log('Removing esArchiver...');
  esArchiverUnload('full_heartbeat');
  esArchiverUnload('browser');

  return res;
}
