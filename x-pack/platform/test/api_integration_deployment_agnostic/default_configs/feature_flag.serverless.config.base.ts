/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FtrConfigProviderContext, Config } from '@kbn/test';
import { defineDockerServersConfig, packageRegistryDocker, dockerRegistryPort } from '@kbn/test';

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { ServerlessProjectType } from '@kbn/es';
import type { DeploymentAgnosticCommonServices } from '../services';
import { services } from '../services';
import { LOCAL_PRODUCT_DOC_PATH } from './common_paths';
import { updateKbnServerArguments } from './helpers';

interface CreateTestConfigOptions<T extends DeploymentAgnosticCommonServices> {
  serverlessProject: ServerlessProjectType;
  esServerArgs?: string[];
  kbnServerArgs?: string[];
  services?: T;
  testFiles: string[];
  junit: { reportName: string };
  suiteTags?: { include?: string[]; exclude?: string[] };
}

// include settings from elasticsearch controller
// https://github.com/elastic/elasticsearch-controller/blob/main/helm/values.yaml
const esServerArgsFromController = {
  es: [],
  oblt: ['xpack.apm_data.enabled=true'],
  security: ['xpack.security.authc.api_key.cache.max_keys=70000'],
  workplaceai: [],
};

// include settings from kibana controller
// https://github.com/elastic/kibana-controller/blob/main/internal/controllers/kibana/config/config_settings.go
const kbnServerArgsFromController = {
  es: [
    // useful for testing (also enabled in MKI QA)
    '--coreApp.allowDynamicConfigOverrides=true',
  ],
  oblt: [
    '--coreApp.allowDynamicConfigOverrides=true',
    // defined in MKI control plane
    '--xpack.uptime.service.manifestUrl=mockDevUrl',
  ],
  security: [
    '--coreApp.allowDynamicConfigOverrides=true',
    // disable fleet task that writes to metrics.fleet_server.* data streams, impacting functional tests
    `--xpack.task_manager.unsafe.exclude_task_types=${JSON.stringify(['Fleet-Metrics-Task'])}`,
  ],
  workplaceai: [],
};

export function createServerlessFeatureFlagTestConfig<T extends DeploymentAgnosticCommonServices>(
  options: CreateTestConfigOptions<T>
) {
  return async ({ readConfigFile }: FtrConfigProviderContext): Promise<Config> => {
    let kbnServerArgs: string[] = [];

    if (options.kbnServerArgs) {
      kbnServerArgs = await updateKbnServerArguments(options.kbnServerArgs);
    }

    const svlSharedConfig = await readConfigFile(
      require.resolve('../../serverless/shared/config.base.ts')
    );

    return {
      ...svlSharedConfig.getAll(),

      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      services: {
        // services can be customized, but must extend DeploymentAgnosticCommonServices
        ...(options.services || services),
      },
      dockerServers: defineDockerServersConfig({
        registry: packageRegistryDocker,
      }),
      esTestCluster: {
        ...svlSharedConfig.get('esTestCluster'),
        serverArgs: [
          ...svlSharedConfig.get('esTestCluster.serverArgs'),
          ...esServerArgsFromController[options.serverlessProject],
          ...(options.esServerArgs || []),
          'xpack.security.authc.native_roles.enabled=true',
        ],
      },
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          ...kbnServerArgsFromController[options.serverlessProject],
          `--serverless=${options.serverlessProject}`,
          ...(options.serverlessProject === 'oblt'
            ? [
                // defined in MKI control plane. Necessary for Synthetics app testing
                '--xpack.uptime.service.password=test',
                '--xpack.uptime.service.username=localKibanaIntegrationTestsUser',
                '--xpack.uptime.service.devUrl=mockDevUrl',
                '--xpack.uptime.service.manifestUrl=mockDevUrl',
                `--xpack.productDocBase.artifactRepositoryUrl=file:///${LOCAL_PRODUCT_DOC_PATH}`,
              ]
            : []),
          ...(dockerRegistryPort
            ? [`--xpack.fleet.registryUrl=http://localhost:${dockerRegistryPort}`]
            : []),
          ...kbnServerArgs,
        ],
      },
      testFiles: options.testFiles,
      junit: options.junit,
      suiteTags: {
        include: options.suiteTags?.include,
        exclude: [...(options.suiteTags?.exclude || []), 'skipServerless'],
      },
    };
  };
}
