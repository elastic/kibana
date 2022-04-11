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
    // We only care about Endpoint package policies
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
      //   newPackagePolicy.policy_id,
      existingRuleTemplates.saved_objects
    );

    try {
      await savedObjectsClient.bulkCreate(cspRules);
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
  client: ISavedObjectsRepository
): PostPackagePolicyDeleteCallback => {
  return async (deletePackagePolicy): Promise<void> => {
    const { saved_objects: SavedObjects }: SavedObjectsFindResponse<CspRuleSchema> =
      await client.find({
        type: cspRuleAssetSavedObjectType,
      });

    for (const policy of deletePackagePolicy) {
      if (isCspPackagePolicy(policy)) {
        // Get attached rules per package policy
        SavedObjects.filter((rule) => rule.attributes.package_policy_id === policy.policy_id).map(
          (rule) => client.delete(cspRuleAssetSavedObjectType, rule.id)
        );
      }
    }

    await Promise.all(SavedObjects);
  };
};

const generateRulesFromTemplates = (
  packagePolicyID: string,
  cspRuleTemplates: Array<SavedObjectsFindResult<CloudSecurityPostureRuleTemplateSchema>>
): Array<SavedObjectsBulkCreateObject<CspRuleSchema>> => {
  const CIS_BENCHMARK_RULES: Array<SavedObjectsBulkCreateObject<CspRuleSchema>> = [];

  for (const ruleTemplate of cspRuleTemplates) {
    const ruleAttributes = {} as any;
    // link csp rule with a package policy
    ruleAttributes.package_policy_id = packagePolicyID;
    Object.assign(ruleAttributes, ruleTemplate.attributes);

    CIS_BENCHMARK_RULES.push({
      attributes: ruleAttributes,
      type: cspRuleAssetSavedObjectType,
    });
  }

  return CIS_BENCHMARK_RULES;
};
