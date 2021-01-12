/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withProcRunner } from '@kbn/dev-utils';
import { resolve } from 'path';
import Url from 'url';
import { FtrProviderContext } from './ftr_provider_context';

export async function APMCypressVisualTestRunner({
  getService,
}: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  // const esArchiver = getService('esArchiver');

  // await esArchiver.load('empty_kibana');
  // await esArchiver.load('auditbeat');

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: ['cypress:open'],
      cwd: resolve(__dirname, '../'),
      env: {
        FORCE_COLOR: '1',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_baseUrl: Url.format(config.get('servers.kibana')),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_protocol: config.get('servers.kibana.protocol'),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_hostname: config.get('servers.kibana.hostname'),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_configport: config.get('servers.kibana.port'),
        CYPRESS_ELASTICSEARCH_URL: Url.format(
          config.get('servers.elasticsearch')
        ),
        CYPRESS_ELASTICSEARCH_USERNAME: config.get(
          'servers.elasticsearch.username'
        ),
        CYPRESS_ELASTICSEARCH_PASSWORD: config.get(
          'servers.elasticsearch.password'
        ),
        CYPRESS_KIBANA_URL: Url.format({
          protocol: config.get('servers.kibana.protocol'),
          hostname: config.get('servers.kibana.hostname'),
          port: config.get('servers.kibana.port'),
        }),
        ...process.env,
      },
      wait: true,
    });
  });
}
