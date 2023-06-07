/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { ElasticsearchClient } from '@kbn/core/server';
import { fetchFindLatestPackageOrThrow } from '@kbn/fleet-plugin/server/services/epm/registry';
import { getApmPolicy } from './get_apm_policy';
import { ProfilingSetupOptions } from './types';
import { PartialSetupState } from '../../../common/setup';
import { PackageInputType } from '../..';

async function createIngestAPIKey(esClient: ElasticsearchClient) {
  const apiKeyResponse = await esClient.security.createApiKey({
    name: 'profiling-manager',
    role_descriptors: {
      profiling_manager: {
        indices: [
          {
            names: ['profiling-*', '.profiling-*'],
            privileges: [
              'read',
              'create_doc',
              'create',
              'write',
              'index',
              'create_index',
              'view_index_metadata',
              'manage',
            ],
          },
        ],
        cluster: ['monitor'],
      },
    },
  });

  return atob(apiKeyResponse.encoded);
}

export async function validateApmPolicy({
  soClient,
  packagePolicyClient,
}: ProfilingSetupOptions): Promise<PartialSetupState> {
  const apmPolicy = await getApmPolicy({ packagePolicyClient, soClient });
  return {
    policies: {
      apm: {
        installed: !!(apmPolicy && apmPolicy?.inputs[0].config?.['apm-server'].value?.profiling),
      },
    },
  };
}

export async function updateApmPolicy({
  client,
  soClient,
  packagePolicyClient,
}: ProfilingSetupOptions) {
  const esClient = client.getEsClient();
  const apmPolicy = await getApmPolicy({ packagePolicyClient, soClient });

  if (!apmPolicy) {
    throw new Error(`Could not find APM policy`);
  }

  const apmPolicyApiKey = await createIngestAPIKey(esClient);

  const profilingApmConfig = {
    profiling: {
      enabled: true,
      elasticsearch: {
        api_key: apmPolicyApiKey,
      },
      metrics: {
        elasticsearch: {
          hosts: ['https://1b6c02856ea642a6ac14499b01507233.us-east-2.aws.elastic-cloud.com:443'],
          api_key: 'woq-IoMBRbbiEbPugtWW:_iBmc1PdSout7sf5FCkEpA',
        },
      },
      keyvalue_retention: {
        // 60 days
        age: '1440h',
        // 200 Gib
        size_bytes: 200 * 1024 * 1024 * 1024,
        execution_interval: '12h',
      },
    },
  };

  const {
    id,
    revision,
    updated_at: updateAt,
    updated_by: updateBy,
    ...apmPolicyModified
  } = apmPolicy;

  apmPolicyModified.inputs = apmPolicy.inputs.map((input) => {
    return input.type === 'apm'
      ? merge({}, input, { config: { 'apm-server': { value: profilingApmConfig } } })
      : input;
  });

  await packagePolicyClient.update(soClient, esClient, id, apmPolicyModified);
}

const CLOUD_AGENT_POLICY_ID = 'policy-elastic-agent-on-cloud';
const COLLECTOR_PACKAGE_POLICY_NAME = 'elastic-universal-profiling-collector';
const SYMBOLIZER_PACKAGE_POLICY_NAME = 'elastic-universal-profiling-symbolizer';

export async function validateCollectorPackagePolicy({
  soClient,
  packagePolicyClient,
}: ProfilingSetupOptions): Promise<PartialSetupState> {
  const packagePolicies = await packagePolicyClient.list(soClient, {});
  return {
    policies: {
      collector: {
        installed: packagePolicies.items.some((pkg) => pkg.name === COLLECTOR_PACKAGE_POLICY_NAME),
      },
    },
  };
}

export function generateSecretToken() {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 16; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

export function getVarsFor({
  config,
  includeSecretToken,
}: {
  config: PackageInputType;
  includeSecretToken: boolean;
}) {
  const configKeys = Object.keys(config) as Array<keyof PackageInputType>;
  if (includeSecretToken) {
    configKeys.push('secret_token');
  }

  return configKeys.reduce<
    Partial<Record<keyof PackageInputType, { type: 'text' | 'bool'; value: any }>>
  >((acc, currKey) => {
    const value = currKey === 'secret_token' ? generateSecretToken() : config[currKey];
    const type = typeof value === 'boolean' ? 'bool' : 'text';
    return {
      ...acc,
      [currKey]: { type, value },
    };
  }, {});
}

export async function createCollectorPackagePolicy({
  client,
  soClient,
  packagePolicyClient,
  config,
}: ProfilingSetupOptions) {
  const packageName = 'profiler_collector';
  const { version } = await fetchFindLatestPackageOrThrow(packageName, { prerelease: true });
  const packagePolicy = {
    policy_id: CLOUD_AGENT_POLICY_ID,
    enabled: true,
    package: {
      name: packageName,
      title: 'Universal Profiling Collector',
      version,
    },
    name: COLLECTOR_PACKAGE_POLICY_NAME,
    namespace: 'default',
    inputs: [
      {
        policy_template: 'universal_profiling_collector',
        enabled: true,
        streams: [],
        type: 'pf-elastic-collector',
        vars: config?.collector
          ? getVarsFor({ config: config.collector, includeSecretToken: true })
          : {},
      },
    ],
  };
  const esClient = client.getEsClient();
  await packagePolicyClient.create(soClient, esClient, packagePolicy, {
    force: true,
  });
}

export async function validateSymbolizerPackagePolicy({
  soClient,
  packagePolicyClient,
}: ProfilingSetupOptions): Promise<PartialSetupState> {
  const packagePolicies = await packagePolicyClient.list(soClient, {});
  return {
    policies: {
      symbolizer: {
        installed: packagePolicies.items.some((pkg) => pkg.name === SYMBOLIZER_PACKAGE_POLICY_NAME),
      },
    },
  };
}

export async function createSymbolizerPackagePolicy({
  client,
  soClient,
  packagePolicyClient,
  config,
}: ProfilingSetupOptions) {
  const packageName = 'profiler_symbolizer';
  const { version } = await fetchFindLatestPackageOrThrow(packageName, { prerelease: true });
  const packagePolicy = {
    policy_id: CLOUD_AGENT_POLICY_ID,
    enabled: true,
    package: {
      name: packageName,
      title: 'Universal Profiling Symbolizer',
      version,
    },
    name: SYMBOLIZER_PACKAGE_POLICY_NAME,
    namespace: 'default',
    inputs: [
      {
        policy_template: 'universal_profiling_symbolizer',
        enabled: true,
        streams: [],
        type: 'pf-elastic-symbolizer',
        // doesnt have secret token
        vars: config?.symbolizer
          ? getVarsFor({ config: config.symbolizer, includeSecretToken: false })
          : {},
      },
    ],
  };
  const esClient = client.getEsClient();
  await packagePolicyClient.create(soClient, esClient, packagePolicy, {
    force: true,
  });
}
