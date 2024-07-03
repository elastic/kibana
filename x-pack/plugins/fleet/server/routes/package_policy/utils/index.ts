/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { CreatePackagePolicyRequestSchema, PackagePolicyInput } from '../../../types';
import { licenseService } from '../../../services';
import type { SimplifiedPackagePolicy } from '../../../../common/services/simplified_package_policy_helper';

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

  return {
    canUseReusablePolicies: hasEnterpriseLicence,
    errorMessage: 'Reusable integration policies are only available with an Enterprise license',
  };
}
