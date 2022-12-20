/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import {
  NewPackagePolicy,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { BenchmarkId } from '../../common/types';
import { isEnabledBenchmarkInputType } from '../../common/utils/helpers';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME, CLOUDBEAT_VANILLA } from '../../common/constants';

export const isCspPackageInstalled = async (
  packagePolicyClient: PackagePolicyClient,
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<boolean> => {
  try {
    const { total } = await packagePolicyClient.list(soClient, {
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`,
      page: 1,
    });

    return total > 0;
  } catch (e) {
    logger.error(e);
    return false;
  }
};
export const getBenchmarkInputType = (
  inputs: PackagePolicy['inputs'] | NewPackagePolicy['inputs']
): BenchmarkId => {
  const enabledInputs = inputs.filter(isEnabledBenchmarkInputType);

  // Use the only enabled input
  if (enabledInputs.length === 1) {
    return getInputType(enabledInputs[0].type);
  }

  // Use the default benchmark id for multiple/none selected
  return getInputType(CLOUDBEAT_VANILLA);
};
const getInputType = (inputType: string): string => {
  // Get the last part of the input type, input type structure: cloudbeat/<benchmark_id>
  return inputType.split('/')[1];
};
