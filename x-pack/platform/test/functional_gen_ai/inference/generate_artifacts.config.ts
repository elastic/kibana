/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import {
  getPreconfiguredConnectorConfig,
  buildEisPreconfiguredConnectors,
} from '@kbn/gen-ai-functional-testing';
import { services } from './ftr_provider_context';

// EIS QA environment URL for Cloud Connected Mode
const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../../functional/config.base.ts')
  );

  const preconfiguredConnectors = {
    ...getPreconfiguredConnectorConfig(),
    ...buildEisPreconfiguredConnectors(),
  };

  return {
    ...xpackFunctionalConfig.getAll(),
    services,
    testFiles: [require.resolve('./artifacts')],
    esTestCluster: {
      ...xpackFunctionalConfig.get('esTestCluster'),
      license: 'trial',
      serverArgs: [
        ...xpackFunctionalConfig.get('esTestCluster.serverArgs'),
        `xpack.inference.elastic.url=${EIS_QA_URL}`,
        `xpack.license.self_generated.type=trial`,
      ],
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.actions.preconfigured=${JSON.stringify(preconfiguredConnectors)}`,
      ],
    },
  };
}
