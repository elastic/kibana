/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, PackagePolicy } from '@kbn/fleet-plugin/common';
import { getApmPolicy } from './get_apm_policy';
import { PartialCloudSetupState, ProfilingCloudSetupOptions } from './cloud_setup';

export const COLLECTOR_PACKAGE_POLICY_NAME = 'elastic-universal-profiling-collector';
export const SYMBOLIZER_PACKAGE_POLICY_NAME = 'elastic-universal-profiling-symbolizer';

async function getPackagePolicy({
  soClient,
  packagePolicyClient,
  packageName,
}: {
  packagePolicyClient: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
  packageName: string;
}): Promise<PackagePolicy | undefined> {
  const packagePolicies = await packagePolicyClient.list(soClient, {
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name:${packageName}`,
  });
  return packagePolicies.items[0];
}

export async function getCollectorPolicy({
  soClient,
  packagePolicyClient,
}: {
  packagePolicyClient: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
}) {
  return getPackagePolicy({
    soClient,
    packagePolicyClient,
    packageName: COLLECTOR_PACKAGE_POLICY_NAME,
  });
}

export async function validateCollectorPackagePolicy({
  soClient,
  packagePolicyClient,
}: ProfilingCloudSetupOptions): Promise<PartialCloudSetupState> {
  const collectorPolicy = await getCollectorPolicy({ soClient, packagePolicyClient });
  return { policies: { collector: { installed: !!collectorPolicy } } };
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

export async function getSymbolizerPolicy({
  soClient,
  packagePolicyClient,
}: {
  packagePolicyClient: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
}) {
  return getPackagePolicy({
    soClient,
    packagePolicyClient,
    packageName: SYMBOLIZER_PACKAGE_POLICY_NAME,
  });
}

export async function validateSymbolizerPackagePolicy({
  soClient,
  packagePolicyClient,
}: ProfilingCloudSetupOptions): Promise<PartialCloudSetupState> {
  const symbolizerPackagePolicy = await getSymbolizerPolicy({ soClient, packagePolicyClient });
  return { policies: { symbolizer: { installed: !!symbolizerPackagePolicy } } };
}

export async function validateProfilingInApmPackagePolicy({
  soClient,
  packagePolicyClient,
}: ProfilingCloudSetupOptions): Promise<PartialCloudSetupState> {
  try {
    const apmPolicy = await getApmPolicy({ packagePolicyClient, soClient });
    return {
      policies: {
        apm: {
          profilingEnabled: !!(
            apmPolicy && apmPolicy?.inputs[0].config?.['apm-server'].value?.profiling
          ),
        },
      },
    };
  } catch (e) {
    // In case apm integration is not available ignore the error and return as profiling is not enabled on the integration
    return {
      policies: { apm: { profilingEnabled: false } },
    };
  }
}
