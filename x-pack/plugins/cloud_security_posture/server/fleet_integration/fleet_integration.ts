/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SavedObjectsBulkCreateObject,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  ISavedObjectsRepository,
  SavedObjectsClientContract,
  Logger,
} from '@kbn/core/server';
import {
  PackagePolicy,
  DeletePackagePoliciesResponse,
  PackagePolicyInput,
} from '@kbn/fleet-plugin/common';
import { createCspRuleSearchFilterByPackagePolicy } from '../../common/utils/helpers';
import {
  CLOUDBEAT_VANILLA,
  CIS_INTEGRATION_INPUTS_MAP,
  CSP_RULE_SAVED_OBJECT_TYPE,
  CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type { CspRule, CspRuleTemplate } from '../../common/schemas';

type InputsMap = typeof CIS_INTEGRATION_INPUTS_MAP;
type Input = {
  [K in keyof InputsMap]: { key: K; value: InputsMap[K] };
}[keyof InputsMap];

const getBenchmarkTypeFilter = (type: Input['value']): string =>
  `${CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.id: "${type}"`;

const isEnabledBenchmarkInputType = (input: PackagePolicyInput) =>
  input.type in CIS_INTEGRATION_INPUTS_MAP && !!input.enabled;

export const getBenchmarkInputType = (inputs: PackagePolicy['inputs']): Input['value'] => {
  const enabledInputs = inputs.filter(isEnabledBenchmarkInputType);

  // Use the only enabled input
  if (enabledInputs.length === 1)
    return CIS_INTEGRATION_INPUTS_MAP[enabledInputs[0].type as Input['key']];

  // Use the the default input for multiple/none selected
  return CIS_INTEGRATION_INPUTS_MAP[CLOUDBEAT_VANILLA];
};

/**
 * Callback to handle creation of PackagePolicies in Fleet
 */
export const onPackagePolicyPostCreateCallback = async (
  logger: Logger,
  packagePolicy: PackagePolicy,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  const benchmarkType = getBenchmarkInputType(packagePolicy.inputs);

  // Create csp-rules from the generic asset
  const existingRuleTemplates: SavedObjectsFindResponse<CspRuleTemplate> =
    await savedObjectsClient.find({
      type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      perPage: 10000,
      filter: getBenchmarkTypeFilter(benchmarkType),
    });

  if (existingRuleTemplates.total === 0) {
    logger.warn(`expected CSP rule templates to exists for type: ${benchmarkType}`);
    return;
  }

  const cspRules = generateRulesFromTemplates(
    packagePolicy.id,
    packagePolicy.policy_id,
    existingRuleTemplates.saved_objects
  );

  try {
    await savedObjectsClient.bulkCreate(cspRules);
    logger.info(`Generated CSP rules for package ${packagePolicy.policy_id}`);
  } catch (e) {
    logger.error('failed to generate rules out of template');
    logger.error(e);
  }
};

/**
 * Callback to handle deletion of PackagePolicies in Fleet
 */
export const removeCspRulesInstancesCallback = async (
  deletedPackagePolicy: DeletePackagePoliciesResponse[number],
  soClient: ISavedObjectsRepository,
  logger: Logger
): Promise<void> => {
  try {
    const { saved_objects: cspRules }: SavedObjectsFindResponse<CspRule> = await soClient.find({
      type: CSP_RULE_SAVED_OBJECT_TYPE,
      filter: createCspRuleSearchFilterByPackagePolicy({
        packagePolicyId: deletedPackagePolicy.id,
        policyId: deletedPackagePolicy.policy_id,
      }),
      perPage: 10000,
    });
    await Promise.all(cspRules.map((rule) => soClient.delete(CSP_RULE_SAVED_OBJECT_TYPE, rule.id)));
  } catch (e) {
    logger.error(`Failed to delete CSP rules after delete package ${deletedPackagePolicy.id}`);
    logger.error(e);
  }
};

export const isCspPackageInstalled = async (
  soClient: ISavedObjectsRepository,
  logger: Logger
): Promise<boolean> => {
  // TODO: check if CSP package installed via the Fleet API
  try {
    const { saved_objects: postDeleteRules }: SavedObjectsFindResponse<CspRule> =
      await soClient.find({
        type: CSP_RULE_SAVED_OBJECT_TYPE,
      });

    if (!postDeleteRules.length) {
      return true;
    }
    return false;
  } catch (e) {
    logger.error(e);
    return false;
  }
};

const generateRulesFromTemplates = (
  packagePolicyId: string,
  policyId: string,
  cspRuleTemplates: Array<SavedObjectsFindResult<CspRuleTemplate>>
): Array<SavedObjectsBulkCreateObject<CspRule>> =>
  cspRuleTemplates.map((template) => ({
    type: CSP_RULE_SAVED_OBJECT_TYPE,
    attributes: {
      ...template.attributes,
      package_policy_id: packagePolicyId,
      policy_id: policyId,
    },
  }));
