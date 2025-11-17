/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreconfiguredConnectorConfig } from '@kbn/gen-ai-functional-testing';
import type { FtrConfigProviderContext } from '@kbn/test';
import { createStatefulTestConfig } from '../../api_integration_deployment_agnostic/default_configs/stateful.config.base';
import { oneChatApiServices } from '../services/api';

// eslint-disable-next-line import/no-default-export
export default async function (ftrContext: FtrConfigProviderContext) {
  const preconfiguredConnectors = getPreconfiguredConnectorConfig();

  return createStatefulTestConfig({
    services: oneChatApiServices,
    testFiles: [require.resolve('./tests')],
    junit: {
      reportName: 'X-Pack Agent Builder Stateful API Integration Tests',
    },
    // @ts-expect-error
    kbnTestServer: {
      serverArgs: [
        '--uiSettings.overrides.agentBuilder:enabled=true',
        `--xpack.actions.preconfigured=${JSON.stringify(preconfiguredConnectors)}`,
      ],
    },
  })(ftrContext);
}
