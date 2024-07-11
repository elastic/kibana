/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { getAgentlessAgentPolicyNameFromPackagePolicyName } from '../../../../common/services/agentless_policy_helper';

import type {
  CreatePackagePolicyRequestSchema,
  PackagePolicy,
  PackagePolicyInput,
} from '../../../types';
import { appContextService } from '../../../services';
import { agentPolicyService, licenseService } from '../../../services';
import type { SimplifiedPackagePolicy } from '../../../../common/services/simplified_package_policy_helper';
import { PackagePolicyRequestError } from '../../../errors';

export function isSimplifiedCreatePackagePolicyRequest(
  body: Omit<TypeOf<typeof CreatePackagePolicyRequestSchema.body>, 'force' | 'package'>
): body is SimplifiedPackagePolicy {
  // If `inputs` is not defined or if it's a non-array, the request body is using the new simplified API
  if (body.inputs && Array.isArray(body.inputs)) {
    return false;
  }

  return true;
}

export function removeFieldsFromInputSchema(
  packagePolicyInputs: PackagePolicyInput[]
): PackagePolicyInput[] {
  // removed fields not recognized by schema
  return packagePolicyInputs.map((input) => {
    const newInput = {
      ...input,
      streams: input.streams.map((stream) => {
        const newStream = { ...stream };
        delete newStream.compiled_stream;
        return newStream;
      }),
    };
    delete newInput.compiled_input;
    return newInput;
  });
}

const LICENCE_FOR_MULTIPLE_AGENT_POLICIES = 'enterprise';

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

/**
 * If an agentless agent policy is associated with the package policy,
 * it will rename the agentless agent policy of a package policy to keep it in sync with the package policy name.
 */
export async function renameAgentlessAgentPolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packagePolicy: PackagePolicy,
  name: string
) {
  const cloudSetup = appContextService.getCloud();
  // If cloud and agentless is enabled, we need to rename the agent policy
  // tech debt: update this condition when Serverless uses the Agentless API
  // https://github.com/elastic/security-team/issues/9781
  if (cloudSetup?.isCloudEnabled && appContextService.getExperimentalFeatures().agentless) {
    const packagePolicyAgentPolicyId = packagePolicy?.policy_id;
    if (packagePolicyAgentPolicyId) {
      const agentPolicy = await agentPolicyService.get(soClient, packagePolicyAgentPolicyId);

      const isManagedAgentlessAgentPolicy =
        agentPolicy?.is_managed && agentPolicy.supports_agentless;

      if (
        isManagedAgentlessAgentPolicy &&
        agentPolicy?.name !== getAgentlessAgentPolicyNameFromPackagePolicyName(name)
      ) {
        try {
          await agentPolicyService.update(
            soClient,
            esClient,
            agentPolicy.id,
            { name: getAgentlessAgentPolicyNameFromPackagePolicyName(name) },
            { force: true }
          );
        } catch (error) {
          throw new PackagePolicyRequestError(
            `Failed to update agent policy name for agentless policy: ${error.message}`
          );
        }
      }
    }
  }
}
