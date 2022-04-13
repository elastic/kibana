/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, RequestHandlerContext } from 'kibana/server';
import type {
  SavedObjectsBulkCreateObject,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  ISavedObjectsRepository,
  Logger,
} from 'src/core/server';
import {
  PostPackagePolicyPostCreateCallback,
  PostPackagePolicyDeleteCallback,
} from '../../../fleet/server';

import { PackagePolicy } from '../../../fleet/common';
import {
  cloudSecurityPostureRuleTemplateSavedObjectType,
  CloudSecurityPostureRuleTemplateSchema,
} from '../../common/schemas/csp_rule_template';

import { CIS_KUBERNETES_PACKAGE_NAME } from '../../common/constants';
import { CspRuleSchema, cspRuleAssetSavedObjectType } from '../../common/schemas/csp_rule';

const isCspPackagePolicy = <T extends { package?: { name: string } }>(
  packagePolicy: T
): boolean => {
  // TODO: check for CSP package type and not specific package
  return packagePolicy.package?.name === CIS_KUBERNETES_PACKAGE_NAME;
};

/**
 * Callback to handle creation of PackagePolicies in Fleet
 */
export const getPackagePolicyCreateCallback = (
  logger: Logger
): PostPackagePolicyPostCreateCallback => {
  return async (
    packagePolicy: PackagePolicy,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<PackagePolicy> => {
    // We only care about Cloud Security Posture package policies
    if (!isCspPackagePolicy(packagePolicy)) {
      return packagePolicy;
    }

    // Create csp-rules from the generic asset
    const savedObjectsClient = context.core.savedObjects.client;
    const existingRuleTemplates: SavedObjectsFindResponse<CloudSecurityPostureRuleTemplateSchema> =
      await savedObjectsClient.find({ type: cloudSecurityPostureRuleTemplateSavedObjectType });

    if (existingRuleTemplates.total === 0) {
      return packagePolicy;
    }

    const cspRules = generateRulesFromTemplates(
      packagePolicy.policy_id,
      existingRuleTemplates.saved_objects
    );

    try {
      await savedObjectsClient.bulkCreate(cspRules);
      logger.info(`Generated CSP rules for package ${packagePolicy.policy_id}`);
    } catch (e) {
      logger.error('failed to generate rules out of template, Error: ', e);
    }
    // The callback cannot change the package policy
    return packagePolicy;
  };
};

/**
 * Callback to handle deletion of PackagePolicies in Fleet
 */
export const getPackagePolicyDeleteCallback = (
  soClient: ISavedObjectsRepository,
  logger: Logger
): PostPackagePolicyDeleteCallback => {
  return async (deletedPackagePolicies): Promise<void> => {
    deletedPackagePolicies.map(async (deletedPackagePolicy) => {
      if (isCspPackagePolicy(deletedPackagePolicy)) {
        try {
          const { saved_objects: cspRules }: SavedObjectsFindResponse<CspRuleSchema> =
            await soClient.find({
              type: cspRuleAssetSavedObjectType,
            });
          // Get attached rules per package policy

          cspRules
            .filter((rule) => rule.attributes.package_policy_id === deletedPackagePolicy.policy_id)
            .map((rule) => soClient.delete(cspRuleAssetSavedObjectType, rule.id));
        } catch (e) {
          logger.error(
            `Failed to delete CSP rules after delete package ${deletedPackagePolicy.id}`
          );
        }
      }
    });
  };
};

const generateRulesFromTemplates = (
  packagePolicyID: string,
  cspRuleTemplates: Array<SavedObjectsFindResult<CloudSecurityPostureRuleTemplateSchema>>
): Array<SavedObjectsBulkCreateObject<CspRuleSchema>> => {
  const concreteRules: Array<SavedObjectsBulkCreateObject<CspRuleSchema>> = [];

  for (const ruleTemplate of cspRuleTemplates) {
    const ruleAttributes = {} as any;
    // link csp rule with a package policy
    ruleAttributes.package_policy_id = packagePolicyID;
    Object.assign(ruleAttributes, ruleTemplate.attributes);

    concreteRules.push({
      attributes: ruleAttributes,
      type: cspRuleAssetSavedObjectType,
    });
  }

  return concreteRules;
};
