/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineDockerServersConfig, FtrConfigProviderContext } from '@kbn/test';
import cypress from 'cypress';
import path from 'path';
import { cypressStart } from './cypress_start';
import { packageRegistryPort } from './ftr_config';
import { FtrProviderContext } from './ftr_provider_context';

export const dockerImage =
  'docker.elastic.co/package-registry/distribution@sha256:de952debe048d903fc73e8a4472bb48bb95028d440cba852f21b863d47020c61';

async function ftrConfigRun({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(require.resolve('./ftr_config.ts'));

  // mount the config file for the package registry
  const dockerArgs: string[] = [
    '-v',
    `${path.join(
      path.dirname(__filename),
      './apis/fixtures/package_registry_config.yml'
    )}:/package-registry/config.yml`,
  ];

  return {
    ...kibanaConfig.getAll(),
    testRunner,
    dockerServers: defineDockerServersConfig({
      registry: {
        enabled: true,
        image: dockerImage,
        portInContainer: 8080,
        port: packageRegistryPort,
        args: dockerArgs,
        waitForLogLine: 'package manifests loaded',
      },
    }),
  };
}

async function testRunner({ getService }: FtrProviderContext) {
  const result = await cypressStart(getService, cypress.run);

  if (result && (result.status === 'failed' || result.totalFailed > 0)) {
    throw new Error(`APM Cypress tests failed`);
  }
}

// eslint-disable-next-line import/no-default-export
export default ftrConfigRun;
