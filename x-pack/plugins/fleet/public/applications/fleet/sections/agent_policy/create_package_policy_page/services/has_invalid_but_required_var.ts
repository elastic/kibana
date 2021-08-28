/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validatePackagePolicyConfig } from '../../../../../../../common/services/validate_package_policy';
import type { RegistryVarsEntry } from '../../../../../../../common/types/models/epm';
import type { PackagePolicyConfigRecord } from '../../../../../../../common/types/models/package_policy';

export const hasInvalidButRequiredVar = (
  registryVars?: RegistryVarsEntry[],
  packagePolicyVars?: PackagePolicyConfigRecord
): boolean => {
  return (
    (registryVars && !packagePolicyVars) ||
    Boolean(
      registryVars &&
        registryVars.find(
          (registryVar) =>
            registryVar.required &&
            (!packagePolicyVars ||
              !packagePolicyVars[registryVar.name] ||
              validatePackagePolicyConfig(packagePolicyVars[registryVar.name], registryVar)?.length)
        )
    )
  );
};
