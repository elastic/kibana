/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import Url from 'url';
import { run as playwrightRun } from '@elastic/synthetics';
import {
  esArchiverLoad,
  esArchiverUnload,
} from './playwright/tasks/es_archiver';
import './journeys';
import { createApmAndObsUsersAndRoles } from '../../apm/scripts/create_apm_users_and_roles/create_apm_users_and_roles';
import { FtrProviderContext } from './ftr_provider_context';
import { setSynthtraceEsClient } from './helpers/synthtrace';

export async function playwrightStart(
  getService: FtrProviderContext['getService'],
  headless: boolean,
  match?: string
) {
  const config = getService('config');

  const kibanaUrl = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
  });

  // Creates APM users
  await createApmAndObsUsersAndRoles({
    elasticsearch: {
      username: config.get('servers.elasticsearch.username'),
      password: config.get('servers.elasticsearch.password'),
    },
    kibana: {
      hostname: kibanaUrl,
      roleSuffix: 'e2e_tests',
    },
  });

  const archiveName = 'apm_mappings_only_8.0.0';

  console.log(`Creating APM mappings`);
  await esArchiverLoad(archiveName);

  const esUrl = Url.format({
    protocol: config.get('servers.elasticsearch.protocol'),
    port: config.get('servers.elasticsearch.port'),
    hostname: config.get('servers.elasticsearch.hostname'),
    auth: `${config.get('servers.elasticsearch.username')}:${config.get(
      'servers.elasticsearch.password'
    )}`,
  });

  const requestTimeout = config.get('timeouts.esRequestTimeout');

  setSynthtraceEsClient({
    esUrl,
    requestTimeout,
    isCloud: !!process.env.TEST_CLOUD,
  });

  const results = await playwrightRun({
    params: { kibanaUrl, getService },
    playwrightOptions: { headless, chromiumSandbox: false, timeout: 60 * 1000 },
    match: match === 'undefined' ? '' : match,
  });

  console.log('Removing APM mappings');
  await esArchiverUnload(archiveName);

  return results;
}
