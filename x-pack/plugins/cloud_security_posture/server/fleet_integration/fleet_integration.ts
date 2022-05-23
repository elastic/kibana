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
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  cloudSecurityPostureRuleTemplateSavedObjectType,
  CloudSecurityPostureRuleTemplateSchema,
} from '../../common/schemas/csp_rule_template';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  cspRuleAssetSavedObjectType,
} from '../../common/constants';
import { CspRuleSchema } from '../../common/schemas/csp_rule';
import { removeTask } from '../task_manager/task_manager_setup';

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
    await savedObjectsClient.find({
      type: cloudSecurityPostureRuleTemplateSavedObjectType,
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
export const onPackagePolicyDeleteCallback = async (
  logger: Logger,
  deletedPackagePolicy: ArrayElement<DeletePackagePoliciesResponse>,
  soClient: ISavedObjectsRepository,
  taskManager: TaskManagerStartContract,
  taskId: string
): Promise<void> => {
  try {
    const { saved_objects: cspRules }: SavedObjectsFindResponse<CspRuleSchema> =
      await soClient.find({
        type: cspRuleAssetSavedObjectType,
        filter: `${cspRuleAssetSavedObjectType}.attributes.package_policy_id: ${deletedPackagePolicy.id} AND ${cspRuleAssetSavedObjectType}.attributes.policy_id: ${deletedPackagePolicy.policy_id}`,
        perPage: 10000,
      });
    await Promise.all(
      cspRules.map((rule) => soClient.delete(cspRuleAssetSavedObjectType, rule.id))
    );
    const { saved_objects: postDeleteRules }: SavedObjectsFindResponse<CspRuleSchema> =
      await soClient.find({
        type: cspRuleAssetSavedObjectType,
      });

    if (!postDeleteRules.length) {
      removeTask(taskManager, taskId, logger);
    }
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
