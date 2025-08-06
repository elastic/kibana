/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));

  const ssl = true;
  const license = 'trial';

  const servers = {
    ...baseIntegrationTestsConfig.get('servers'),
    elasticsearch: {
      ...baseIntegrationTestsConfig.get('servers.elasticsearch'),
      protocol: ssl ? 'https' : 'http',
    },
  };

  return {
    ...baseIntegrationTestsConfig.getAll(),
    servers,
    esTestCluster: {
      ...baseIntegrationTestsConfig.get('esTestCluster'),
      license,
      ssl,
      serverArgs: [`xpack.license.self_generated.type=${license}`],
    },
    kbnTestServer: {
      ...baseIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
        ...(ssl
          ? [
              `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
              `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
            ]
          : []),
      ],
    },
    testFiles: [require.resolve('.')],
    junit: {
      reportName: 'esArcxhiver Flakiness Tests',
    },
  };
}
