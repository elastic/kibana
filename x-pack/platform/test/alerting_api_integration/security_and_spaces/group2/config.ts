/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { createTestConfig } from '../../common/config';

export const EmailMaximumBodyLength = 10000;

export default async function (context: FtrConfigProviderContext) {
  const config = await createTestConfig('security_and_spaces', {
    disabledPlugins: [],
    license: 'trial',
    ssl: true,
    enableActionsProxy: true,
    publicBaseUrl: true,
    testFiles: [require.resolve('./tests')],
    useDedicatedTaskRunner: true,
    experimentalFeatures: [
      'sentinelOneConnectorOn',
      'crowdstrikeConnectorOn',
      'microsoftDefenderEndpointOn',
    ],
    emailMaximumBodyLength: EmailMaximumBodyLength,
    indexRefreshInterval: '1s',
  })(context);

  return {
    ...config,
    kbnTestServer: {
      ...config.kbnTestServer,
      env: {
        // NODE_EXTRA_CA_CERTS is needed so the Kibana server trusts the self-signed kibana.crt
        // when making HTTPS simulators requests through the CONNECT tunnel.
        NODE_EXTRA_CA_CERTS: CA_CERT_PATH,
      },
    },
  };
}
