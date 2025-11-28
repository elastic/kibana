/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FtrConfigProviderContext } from '@kbn/test';
import { dockerRegistryPort } from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';

import { services } from './services';
import type { CreateTestConfigOptions } from '../shared/types';

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(require.resolve('../shared/config.base.ts'));
    const enableFleetDockerRegistry = options.enableFleetDockerRegistry ?? true;

    return {
      ...svlSharedConfig.getAll(),

      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      services: {
        ...services,
        ...options.services,
      },
      ...(!enableFleetDockerRegistry && { dockerServers: undefined }),
      esTestCluster: {
        ...svlSharedConfig.get('esTestCluster'),
        serverArgs: [
          ...svlSharedConfig.get('esTestCluster.serverArgs'),
          'xpack.security.authc.native_roles.enabled=true',
          ...(options.esServerArgs ?? []),
        ],
      },
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          `--serverless=${options.serverlessProject}`,
          ...(options.kbnServerArgs || []),
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
