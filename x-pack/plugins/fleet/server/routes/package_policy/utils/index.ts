/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { isAgentlessApiEnabled } from '../../../services/utils/agentless';

import { getAgentlessAgentPolicyNameFromPackagePolicyName } from '../../../../common/services/agentless_policy_helper';

import type {
  CreatePackagePolicyRequestSchema,
  PackagePolicy,
  PackagePolicyInput,
  NewPackagePolicyInput,
} from '../../../types';
import { agentPolicyService } from '../../../services';
import type { SimplifiedPackagePolicy } from '../../../../common/services/simplified_package_policy_helper';
import { PackagePolicyRequestError } from '../../../errors';
import type { NewPackagePolicyInputStream } from '../../../../common';

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
  if (!isAgentlessApiEnabled()) {
    return;
  }
  // If agentless is enabled for cloud, we need to rename the agent policy
  // tech debt: update this condition when Serverless uses the Agentless API
  // https://github.com/elastic/security-team/issues/9781
  const packagePolicyAgentPolicyId = packagePolicy?.policy_id;
  if (!packagePolicyAgentPolicyId) {
    return;
  }

  const agentPolicy = await agentPolicyService.get(soClient, packagePolicyAgentPolicyId);
  if (!agentPolicy) {
    return;
  }
  if (!agentPolicy.supports_agentless) {
    return;
  }

  const agentlessAgentPolicyName = getAgentlessAgentPolicyNameFromPackagePolicyName(name);

  // If the agent policy is already correct, we don't need to update it
  if (agentPolicy.name === agentlessAgentPolicyName) {
    return;
  }

  try {
    await agentPolicyService.update(
      soClient,
      esClient,
      agentPolicy.id,
      { name: agentlessAgentPolicyName },
      { force: true }
    );
  } catch (error) {
    throw new PackagePolicyRequestError(
      `Failed to update agent policy name for agentless policy: ${error.message}`
    );
  }
}

function areAllInputStreamDisabled(streams: NewPackagePolicyInputStream[]) {
  return streams.reduce((acc, stream, i) => {
    return !stream.enabled && acc;
  }, true);
}

/**
 *
 * Check if one input is enabled but all of its streams are disabled
 * If true, switch input.enabled to false
 */
export function alignInputsAndStreams(
  packagePolicyInputs: PackagePolicyInput[] | NewPackagePolicyInput[]
) {
  return packagePolicyInputs.map((input) => {
    if (
      input.enabled === true &&
      input?.streams.length > 0 &&
      areAllInputStreamDisabled(input.streams)
    ) {
      const newInput = {
        ...input,
        enabled: false,
      };
      return newInput;
    }
    return input;
  });
}
