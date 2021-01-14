/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import Url from 'url';
import cypress from 'cypress';
import { FtrProviderContext } from './ftr_provider_context';
import archives_metadata from './cypress/fixtures/es_archiver/archives_metadata';

async function APMCypressVisualTestRunner({ getService }: FtrProviderContext) {
  const config = getService('config');
  const esArchiver = getService('esArchiver');

  // Load apm data on ES
  await esArchiver.load('apm_8.0.0');
  const { start, end } = archives_metadata['apm_8.0.0'];

  await cypress.open({
    config: { baseUrl: Url.format(config.get('servers.kibana')) },
    env: {
      METADATA_START_DATE: start,
      METADATA_END_DATE: end,
    },
  });
}

async function visualConfig({ readConfigFile }: FtrConfigProviderContext) {
  const cypressConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...cypressConfig.getAll(),
    testRunner: APMCypressVisualTestRunner,
  };
}

// eslint-disable-next-line import/no-default-export
export default visualConfig;
