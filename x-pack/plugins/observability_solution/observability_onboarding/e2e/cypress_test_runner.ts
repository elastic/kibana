/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cypress from 'cypress';
import path from 'path';
import Url from 'url';
import { createObservabilityOnboardingUsers } from '@kbn/observability-onboarding-plugin/server/test_helpers/create_observability_onboarding_users';
import { FtrProviderContext } from './ftr_provider_context';

export async function cypressTestRunner({
  ftrProviderContext: { getService },
  cypressExecution,
}: {
  ftrProviderContext: FtrProviderContext;
  cypressExecution: typeof cypress.run | typeof cypress.open;
}) {
  const config = getService('config');

  const username = config.get('servers.elasticsearch.username');
  const password = config.get('servers.elasticsearch.password');

  const kibanaUrl = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
    auth: `${username}:${password}`,
  });

  const esNode = Url.format({
    protocol: config.get('servers.elasticsearch.protocol'),
    port: config.get('servers.elasticsearch.port'),
    hostname: config.get('servers.elasticsearch.hostname'),
    auth: `${username}:${password}`,
  });

  // Creates ObservabilityOnboarding users
  await createObservabilityOnboardingUsers({
    elasticsearch: { node: esNode, username, password },
    kibana: { hostname: kibanaUrl },
  });

  const esRequestTimeout = config.get('timeouts.esRequestTimeout');

  const kibanaUrlWithoutAuth = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
  });

  const cypressProjectPath = path.join(__dirname);
  const { open, ...cypressCliArgs } = getCypressCliArgs();

  const res = await cypressExecution({
    ...cypressCliArgs,
    project: cypressProjectPath,
    config: {
      e2e: {
        baseUrl: kibanaUrlWithoutAuth,
      },
    },
    env: {
      KIBANA_URL: kibanaUrlWithoutAuth,
      ES_NODE: esNode,
      ES_REQUEST_TIMEOUT: esRequestTimeout,
      TEST_CLOUD: process.env.TEST_CLOUD,
    },
  });

  return res;
}

function getCypressCliArgs(): Record<string, unknown> {
  if (!process.env.CYPRESS_CLI_ARGS) {
    return {};
  }

  const { $0, _, ...cypressCliArgs } = JSON.parse(process.env.CYPRESS_CLI_ARGS) as Record<
    string,
    unknown
  >;

  const spec =
    typeof cypressCliArgs.spec === 'string' && !cypressCliArgs.spec.includes('**')
      ? `**/${cypressCliArgs.spec}*`
      : cypressCliArgs.spec;

  return { ...cypressCliArgs, spec };
}
