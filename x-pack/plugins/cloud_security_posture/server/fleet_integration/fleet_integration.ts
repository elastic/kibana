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
import { cspRuleAssetSavedObjectType } from '../../common/constants';
import { CspRuleSchema } from '../../common/schemas/csp_rule';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends ReadonlyArray<
  infer ElementType
>
  ? ElementType
  : never;

/**
 * Callback to handle creation of PackagePolicies in Fleet
 */
export const onPackagePolicyPostCreateCallback = async (
  logger: Logger,
  packagePolicy: PackagePolicy,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  console.log(packagePolicy.inputs[0].streams[0].vars.benchmark.value);
  const benchmarkType = packagePolicy.inputs[0].streams[0].vars!.benchmark.value;
  const benchmark = 'eks';

  const existingRuleTemplates: SavedObjectsFindResponse<CloudSecurityPostureRuleTemplateSchema> =
    await savedObjectsClient.find<CloudSecurityPostureRuleTemplateSchema>({
      type: cloudSecurityPostureRuleTemplateSavedObjectType,
      filter: `${cloudSecurityPostureRuleTemplateSavedObjectType}.attributes.benchmark.id: ${benchmark}`,
      perPage: 10000,
    });

  console.log({ existingRuleTemplates });

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
    const { saved_objects: cspRules }: SavedObjectsFindResponse<CspRuleSchema> =
      await soClient.find({
        type: cspRuleAssetSavedObjectType,
        filter: `${cspRuleAssetSavedObjectType}.attributes.package_policy_id: ${deletedPackagePolicy.id} AND ${cspRuleAssetSavedObjectType}.attributes.policy_id: ${deletedPackagePolicy.policy_id}`,
        perPage: 10000,
      });
    await Promise.all(
      cspRules.map((rule) => soClient.delete(cspRuleAssetSavedObjectType, rule.id))
    );
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
    const { saved_objects: postDeleteRules }: SavedObjectsFindResponse<CspRuleSchema> =
      await soClient.find({
        type: cspRuleAssetSavedObjectType,
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
