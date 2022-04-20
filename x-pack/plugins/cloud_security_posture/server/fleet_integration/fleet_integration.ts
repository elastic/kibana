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
  cloudSecurityPostureRuleTemplateSavedObjectType,
  CloudSecurityPostureRuleTemplateSchema,
} from '../../common/schemas/csp_rule_template';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../common/constants';
import { CspRuleSchema, cspRuleAssetSavedObjectType } from '../../common/schemas/csp_rule';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends ReadonlyArray<
  infer ElementType
>
  ? ElementType
  : never;

const isCspPackagePolicy = <T extends { package?: { name: string } }>(
  packagePolicy: T
): boolean => {
  return packagePolicy.package?.name === CLOUD_SECURITY_POSTURE_PACKAGE_NAME;
};

/**
 * Callback to handle creation of PackagePolicies in Fleet
 */
export const onPackagePolicyPostCreateCallback = async (
  logger: Logger,
  packagePolicy: PackagePolicy,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  // We only care about Cloud Security Posture package policies
  if (!isCspPackagePolicy(packagePolicy)) {
    return;
  }
  // Create csp-rules from the generic asset
  const existingRuleTemplates: SavedObjectsFindResponse<CloudSecurityPostureRuleTemplateSchema> =
    await savedObjectsClient.find({ type: cloudSecurityPostureRuleTemplateSavedObjectType });

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
export const onPackagePolicyDeleteCallback = async (
  logger: Logger,
  deletedPackagePolicy: ArrayElement<DeletePackagePoliciesResponse>,
  soClient: ISavedObjectsRepository
): Promise<void> => {
  try {
    const { saved_objects: cspRules }: SavedObjectsFindResponse<CspRuleSchema> =
      await soClient.find({
        type: cspRuleAssetSavedObjectType,
        filter: `csp_rule.attributes.package_policy_id: ${deletedPackagePolicy.id} AND csp_rule.attributes.policy_id: ${deletedPackagePolicy.policy_id}`,
      });
    await Promise.all(
      cspRules.map((rule) => soClient.delete(cspRuleAssetSavedObjectType, rule.id))
    );
  } catch (e) {
    logger.error(`Failed to delete CSP rules after delete package ${deletedPackagePolicy.id}`);
    logger.error(e);
  }
};

const generateRulesFromTemplates = (
  packagePolicyId: string,
  policyId: string,
  cspRuleTemplates: Array<SavedObjectsFindResult<CloudSecurityPostureRuleTemplateSchema>>
): Array<SavedObjectsBulkCreateObject<CspRuleSchema>> =>
  cspRuleTemplates.map((template) => ({
    type: cspRuleAssetSavedObjectType,
    attributes: {
      ...template.attributes,
      package_policy_id: packagePolicyId,
      policy_id: policyId,
    },
  }));
