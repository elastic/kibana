/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageConfigConfigRecord, RegistryVarsEntry } from '../../../../types';
import { validatePackageConfigConfig } from './';

export const hasInvalidButRequiredVar = (
  registryVars?: RegistryVarsEntry[],
  packageConfigVars?: PackageConfigConfigRecord
): boolean => {
  return (
    (registryVars && !packageConfigVars) ||
    Boolean(
      registryVars &&
        registryVars.find(
          (registryVar) =>
            registryVar.required &&
            (!packageConfigVars ||
              !packageConfigVars[registryVar.name] ||
              validatePackageConfigConfig(packageConfigVars[registryVar.name], registryVar)?.length)
        )
    )
  );
};
