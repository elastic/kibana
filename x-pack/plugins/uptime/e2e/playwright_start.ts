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
import { createApmAndObsUsersAndRoles } from '../../apm/scripts/create_apm_users_and_roles/create_apm_users_and_roles';

const listOfJourneys = [
  'uptime',
  'StepsDuration',
  'TlsFlyoutInAlertingApp',
  'StatusFlyoutInAlertingApp',
  'DefaultEmailSettings',
  'MonitorManagement-http',
  'MonitorManagement-tcp',
  'MonitorManagement-icmp',
  'MonitorManagement-browser',
  'MonitorManagement breadcrumbs',
] as const;

export function playwrightRunTests({ headless, match }: { headless: boolean; match?: string }) {
  return async ({ getService }: any) => {
    const result = await playwrightStart(getService, headless, match);

    listOfJourneys.forEach((journey) => {
      if (result?.[journey] && result[journey].status !== 'succeeded') {
        throw new Error('Tests failed');
      }
    });
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

  await createApmAndObsUsersAndRoles({
    elasticsearch: { username: 'elastic', password: 'changeme' },
    kibana: { roleSuffix: 'e2e', hostname: kibanaUrl },
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
