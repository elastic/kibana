/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import {
  LICENCE_FOR_OUTPUT_PER_INTEGRATION,
  LICENCE_FOR_MULTIPLE_AGENT_POLICIES,
} from '../../../common/constants';
import { getAllowedOutputTypesForIntegration } from '../../../common/services/output_helpers';
import type { PackagePolicy, NewPackagePolicy, PackagePolicySOAttributes } from '../../types';
import { PackagePolicyMultipleAgentPoliciesError, PackagePolicyOutputError } from '../../errors';
import { licenseService } from '../license';
import { outputService } from '../output';
import { appContextService } from '../app_context';

export const mapPackagePolicySavedObjectToPackagePolicy = ({
  /* eslint-disable @typescript-eslint/naming-convention */
  id,
  version,
  attributes: {
    name,
    description,
    namespace,
    enabled,
    is_managed,
    policy_id,
    policy_ids,
    output_id,
    // `package` is a reserved keyword
    package: packageInfo,
    inputs,
    vars,
    elasticsearch,
    agents,
    revision,
    secret_references,
    updated_at,
    updated_by,
    created_at,
    created_by,
    /* eslint-enable @typescript-eslint/naming-convention */
  },
}: SavedObject<PackagePolicySOAttributes>): PackagePolicy => {
  return {
    id,
    name,
    description,
    namespace,
    enabled,
    is_managed,
    policy_id,
    policy_ids,
    output_id,
    package: packageInfo,
    inputs,
    vars,
    elasticsearch,
    version,
    agents,
    revision,
    secret_references,
    updated_at,
    updated_by,
    created_at,
    created_by,
  };
};

export async function preflightCheckPackagePolicy(
  soClient: SavedObjectsClientContract,
  packagePolicy: PackagePolicy | NewPackagePolicy
) {
  // If package policy has multiple agent policies IDs, or no agent policies (orphaned integration policy)
  // check if user can use multiple agent policies feature
  const { canUseReusablePolicies, errorMessage: canUseMultipleAgentPoliciesErrorMessage } =
    canUseMultipleAgentPolicies();
  if (!canUseReusablePolicies && packagePolicy.policy_ids.length !== 1) {
    throw new PackagePolicyMultipleAgentPoliciesError(canUseMultipleAgentPoliciesErrorMessage);
  }

  // If package policy has an output_id, check if it can be used
  if (packagePolicy.output_id && packagePolicy.package) {
    const { canUseOutputForIntegrationResult, errorMessage: outputForIntegrationErrorMessage } =
      await canUseOutputForIntegration(
        soClient,
        packagePolicy.package.name,
        packagePolicy.output_id
      );
    if (!canUseOutputForIntegrationResult && outputForIntegrationErrorMessage) {
      throw new PackagePolicyOutputError(outputForIntegrationErrorMessage);
    }
  }
}

export function canUseMultipleAgentPolicies() {
  const hasEnterpriseLicence = licenseService.hasAtLeast(LICENCE_FOR_MULTIPLE_AGENT_POLICIES);
  const { enableReusableIntegrationPolicies } = appContextService.getExperimentalFeatures();

  return {
    canUseReusablePolicies: hasEnterpriseLicence && enableReusableIntegrationPolicies,
    errorMessage: !hasEnterpriseLicence
      ? 'Reusable integration policies are only available with an Enterprise license'
      : 'Reusable integration policies are not supported',
  };
}

export async function canUseOutputForIntegration(
  soClient: SavedObjectsClientContract,
  packageName: string,
  outputId: string
) {
  const hasAllowedLicense = licenseService.hasAtLeast(LICENCE_FOR_OUTPUT_PER_INTEGRATION);
  if (!hasAllowedLicense) {
    return {
      canUseOutputForIntegrationResult: false,
      errorMessage: `Output per integration is only available with an ${LICENCE_FOR_OUTPUT_PER_INTEGRATION} license`,
    };
  }

  const allowedOutputTypes = getAllowedOutputTypesForIntegration(packageName);
  const output = await outputService.get(soClient, outputId);

  if (!allowedOutputTypes.includes(output.type)) {
    return {
      canUseOutputForIntegrationResult: false,
      errorMessage: `Output type "${output.type}" is not usable with package "${packageName}"`,
    };
  }

  return {
    canUseOutputForIntegrationResult: true,
    errorMessage: null,
  };
}
