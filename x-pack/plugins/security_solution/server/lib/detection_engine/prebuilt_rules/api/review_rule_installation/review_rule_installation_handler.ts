/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  ReviewRuleInstallationResponseBody,
  RuleInstallationStatsForReview,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../logic/rule_versions/fetch_rule_versions_triad';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { getRuleGroups } from '../../model/rule_groups/get_rule_groups';

export const reviewRuleInstallationHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['core', 'alerting']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

    const ruleVersionsMap = await fetchRuleVersionsTriad({
      ruleAssetsClient,
      ruleObjectsClient,
    });
    const { installableRules } = getRuleGroups(ruleVersionsMap);

    const body: ReviewRuleInstallationResponseBody = {
      stats: calculateRuleStats(installableRules),
      rules: installableRules.map((prebuiltRuleAsset) =>
        convertPrebuiltRuleAssetToRuleResponse(prebuiltRuleAsset)
      ),
    };

    return response.ok({ body });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
const getAggregatedTags = (rules: PrebuiltRuleAsset[]): string[] => {
  const set = new Set<string>(rules.flatMap((rule) => rule.tags || []));
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
};
const calculateRuleStats = (
  rulesToInstall: PrebuiltRuleAsset[]
): RuleInstallationStatsForReview => {
  const tagsOfRulesToInstall = getAggregatedTags(rulesToInstall);
  return {
    num_rules_to_install: rulesToInstall.length,
    tags: tagsOfRulesToInstall,
  };
};
