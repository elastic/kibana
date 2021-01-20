/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Url from 'url';
import cypress from 'cypress';
import { FtrProviderContext } from './ftr_provider_context';
import archives_metadata from './cypress/fixtures/es_archiver/archives_metadata';

export async function cypressRunTests({ getService }: FtrProviderContext) {
  await cypressStart(getService, cypress.run);
}

export async function cypressOpenTests({ getService }: FtrProviderContext) {
  await cypressStart(getService, cypress.open);
}

async function cypressStart(
  getService: FtrProviderContext['getService'],
  cypressExecution: typeof cypress.run | typeof cypress.open
) {
  const config = getService('config');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  // Load apm data on ES
  await esArchiver.load(archiveName);
  const { start, end } = archives_metadata[archiveName];

  await cypressExecution({
    config: { baseUrl: Url.format(config.get('servers.kibana')) },
    env: {
      START_DATE: start,
      END_DATE: end,
    },
  });
}
