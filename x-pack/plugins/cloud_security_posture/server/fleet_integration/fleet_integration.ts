/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ISavedObjectsRepository, Logger, SavedObjectsFindResponse } from '@kbn/core/server';
import { NewPackagePolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { BenchmarkId } from '../../common/types';
import { isEnabledBenchmarkInputType } from '../../common/utils/helpers';
import type { CspRule } from '../../common/schemas';
import { CLOUDBEAT_VANILLA, CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../common/constants';

export const isCspPackageInstalled = async (
  soClient: ISavedObjectsRepository,
  logger: Logger
): Promise<boolean> => {
  // TODO: check if CSP package installed via the Fleet API
  try {
    const { saved_objects: postDeleteRules }: SavedObjectsFindResponse<CspRule> =
      await soClient.find({
        type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      });

    if (postDeleteRules.length > 0) {
      return true;
    }
    return true;
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
