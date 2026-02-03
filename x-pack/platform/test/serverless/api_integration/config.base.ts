/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { dockerRegistryPort, type FtrConfigProviderContext } from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';

import { MOCK_IDP_UIAM_SERVICE_URL, MOCK_IDP_UIAM_SHARED_SECRET } from '@kbn/mock-idp-utils';
import { services } from './services';
import type { CreateTestConfigOptions } from '../shared/types';

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(require.resolve('../shared/config.base.ts'));
    const enableFleetDockerRegistry = options.enableFleetDockerRegistry ?? true;
    const dockerServers = svlSharedConfig.get('dockerServers');

    return {
      ...svlSharedConfig.getAll(),

      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      services: {
        ...services,
        ...options.services,
      },
      dockerServers:
        !enableFleetDockerRegistry && dockerServers?.registry
          ? { ...dockerServers, registry: { ...dockerServers.registry, enabled: false } }
          : dockerServers,
      esTestCluster: {
        ...svlSharedConfig.get('esTestCluster'),
        serverArgs: [
          ...svlSharedConfig.get('esTestCluster.serverArgs'),
          'xpack.security.authc.native_roles.enabled=true',
          ...(options.esServerArgs ?? []),
        ],
      },
      esServerlessOptions: {
        ...svlSharedConfig.get('esServerlessOptions'),
        ...(options.esServerlessOptions || {}),
      },
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          `--serverless=${options.serverlessProject}`,
          ...(options.kbnServerArgs || []),
          ...(options.esServerlessOptions?.uiam
            ? [
                '--mockIdpPlugin.uiam.enabled=true',
                `--xpack.security.uiam.enabled=true`,
                `--xpack.security.uiam.url=${MOCK_IDP_UIAM_SERVICE_URL}`,
                `--xpack.security.uiam.sharedSecret=${MOCK_IDP_UIAM_SHARED_SECRET}`,
              ]
            : []),
          ...(enableFleetDockerRegistry && dockerRegistryPort
            ? [`--xpack.fleet.registryUrl=http://localhost:${dockerRegistryPort}`]
            : []),
        ],
      },
      testFiles: options.testFiles,
      junit: options.junit,
      suiteTags: options.suiteTags,
    };
  };
}
