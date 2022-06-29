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
import { PackagePolicy, DeletePackagePoliciesResponse } from '@kbn/fleet-plugin/common';
import {
  createCspRuleSearchFilterByPackagePolicy,
  isNonNullable,
} from '../../common/utils/helpers';
import {
  CSP_RULE_SAVED_OBJECT_TYPE,
  CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type { CspRuleType, CspRuleTemplateType } from '../../common/schemas';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends ReadonlyArray<
  infer ElementType
>
  ? ElementType
  : never;

const foo = { 'cloudbeat/vanilla': 'cis_k8s', 'cloudbeat/eks': 'cis_eks' };
type BenchmarkTypes = 'cloudbeat/vanilla' | 'cloudbeat/eks';

const getActivatedBenchmark = (packagePolicy: PackagePolicy): string => {
  const activateBenchmarks = packagePolicy.inputs
    .map((input) => (input.enabled ? input.type : undefined))
    .filter(isNonNullable);
};

/**
 * Callback to handle creation of PackagePolicies in Fleet
 */
export const onPackagePolicyPostCreateCallback = async (
  logger: Logger,
  packagePolicy: PackagePolicy,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  console.log({ packagePolicy });
  console.log(packagePolicy.inputs);
  console.log(packagePolicy.inputs[0]);
  const activatedBenchmark = getActivatedBenchmark(packagePolicy);

  // Create csp-rules from the generic asset
  const existingRuleTemplates: SavedObjectsFindResponse<CspRuleTemplateType> =
    await savedObjectsClient.find({
      type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      filter: `${CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmarks.id: '${activatedBenchmark}'`,
      perPage: 10000,
    });

  if (existingRuleTemplates.total === 0) {
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
  deletedPackagePolicy: ArrayElement<DeletePackagePoliciesResponse>,
  soClient: ISavedObjectsRepository,
  logger: Logger
): Promise<void> => {
  try {
    const { saved_objects: cspRules }: SavedObjectsFindResponse<CspRuleType> = await soClient.find({
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
    const { saved_objects: postDeleteRules }: SavedObjectsFindResponse<CspRuleType> =
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
  cspRuleTemplates: Array<SavedObjectsFindResult<CspRuleTemplateType>>
): Array<SavedObjectsBulkCreateObject<CspRuleType>> =>
  cspRuleTemplates.map((template) => ({
    type: CSP_RULE_SAVED_OBJECT_TYPE,
    attributes: {
      ...template.attributes,
      package_policy_id: packagePolicyId,
      policy_id: policyId,
    },
  }));
