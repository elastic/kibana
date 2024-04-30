/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchFindLatestPackageOrThrow } from '@kbn/fleet-plugin/server/services/epm/registry';
import {
  COLLECTOR_PACKAGE_POLICY_NAME,
  ELASTIC_CLOUD_APM_POLICY,
  getApmPolicy,
  SYMBOLIZER_PACKAGE_POLICY_NAME,
} from '@kbn/profiling-data-access-plugin/common';
import { omit } from 'lodash';
import { PackageInputType } from '../..';
import { ProfilingCloudSetupOptions } from './types';

const CLOUD_AGENT_POLICY_ID = 'policy-elastic-agent-on-cloud';

export function generateSecretToken() {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 16; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

type PackagePolicyVars = PackageInputType & { secret_token?: string };
export function getVarsFor({
  config,
  includeSecretToken,
}: {
  config: PackageInputType;
  includeSecretToken: boolean;
}) {
  const configKeys = Object.keys(config) as Array<keyof PackagePolicyVars>;
  if (includeSecretToken) {
    configKeys.push('secret_token');
  }

  return configKeys.reduce<
    Partial<Record<keyof PackagePolicyVars, { type: 'text' | 'bool'; value: any }>>
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
}: ProfilingCloudSetupOptions) {
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

export async function createSymbolizerPackagePolicy({
  client,
  soClient,
  packagePolicyClient,
  config,
}: ProfilingCloudSetupOptions) {
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

export async function removeProfilingFromApmPackagePolicy({
  client,
  soClient,
  packagePolicyClient,
}: ProfilingCloudSetupOptions) {
  const apmPackagePolicy = await getApmPolicy({ packagePolicyClient, soClient });
  if (!apmPackagePolicy) {
    throw new Error(`Could not find APM package policy`);
  }
  const esClient = client.getEsClient();
  // remove profiling from apm-server config
  const newPackagePolicy = omit(apmPackagePolicy, "inputs[0].config['apm-server'].value.profiling");
  await packagePolicyClient.update(soClient, esClient, ELASTIC_CLOUD_APM_POLICY, newPackagePolicy);
}
