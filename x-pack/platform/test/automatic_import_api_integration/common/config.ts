/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CA_CERT_PATH } from '@kbn/dev-utils';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
  ssl?: boolean;
  testFiles?: string[];
  publicBaseUrl?: boolean;
}

const enabledActionTypes = ['.bedrock', '.gemini', '.gen-ai'];

export function createTestConfig(name: string, options: CreateTestConfigOptions) {
  const { license = 'trial', disabledPlugins = [], ssl = false, testFiles = [] } = options;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackApiIntegrationTestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const servers = {
      ...xPackApiIntegrationTestsConfig.get('servers'),
      elasticsearch: {
        ...xPackApiIntegrationTestsConfig.get('servers.elasticsearch'),
        protocol: ssl ? 'https' : 'http',
      },
    };

    return {
      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      testFiles,
      servers,
      services,
      junit: {
        reportName: 'X-Pack Automatic Import API Integration Tests',
      },
      esTestCluster: {
        ...xPackApiIntegrationTestsConfig.get('esTestCluster'),
        license,
        ssl,
        serverArgs: [
          `xpack.license.self_generated.type=${license}`,
          `xpack.security.enabled=${
            !disabledPlugins.includes('security') && ['trial', 'basic'].includes(license)
          }`,
        ],
      },
      kbnTestServer: {
        ...xPackApiIntegrationTestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackApiIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
          ...(options.publicBaseUrl ? ['--server.publicBaseUrl=https://localhost:5601'] : []),
          `--xpack.actions.allowedHosts=${JSON.stringify(['localhost', 'some.non.existent.com'])}`,
          `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
          '--xpack.eventLog.logEntries=true',
          // Configure a bedrock connector as a default
          `--xpack.actions.preconfigured=${JSON.stringify({
            'preconfigured-bedrock': {
              name: 'preconfigured-bedrock',
              actionTypeId: '.bedrock',
              config: {
                apiUrl: 'https://example.com',
              },
              secrets: {
                username: 'elastic',
                password: 'elastic',
              },
            },
          })}`,
          ...(ssl
            ? [
                `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
                `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
              ]
            : []),
          '--xpack.automatic_import.enabled=true',
        ],
      },
    };
  };
}
