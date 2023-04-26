/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { REVIEW_RULE_INSTALLATION_URL } from '../../../../../../common/detection_engine/prebuilt_rules';
import type {
  ReviewRuleInstallationResponseBody,
  RuleInstallationInfoForReview,
  RuleInstallationStatsForReview,
} from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_installation/response_schema';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';

import { convertRuleToDiffable } from '../../logic/diff/normalization/convert_rule_to_diffable';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { getVersionBuckets } from '../../model/rule_versions/get_version_buckets';

export const reviewRuleInstallationRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: REVIEW_RULE_INSTALLATION_URL,
      validate: {},
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const ctx = await context.resolve(['core', 'alerting']);
        const soClient = ctx.core.savedObjects.client;
        const rulesClient = ctx.alerting.getRulesClient();
        const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
        const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

        const [latestVersions, { installedVersions }] = await Promise.all([
          ruleAssetsClient.fetchLatestVersions(),
          ruleObjectsClient.fetchInstalledRules(),
        ]);

        const versionBuckets = getVersionBuckets({
          latestVersions,
          installedVersions,
        });

        const rulesToInstall = await ruleAssetsClient.fetchAssetsByVersionInfo(
          versionBuckets.latestVersionsToInstall
        );

        const body: ReviewRuleInstallationResponseBody = {
          status_code: 200,
          message: 'OK',
          attributes: {
            stats: calculateRuleStats(rulesToInstall),
            rules: calculateRuleInfos(rulesToInstall),
          },
        };

        return response.ok({ body });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};

const getAggregatedTags = (rules: PrebuiltRuleAsset[]): string[] => {
  const set = new Set<string>(rules.flatMap((rule) => rule.tags || []));
  return Array.from(set.values());
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

const calculateRuleInfos = (
  rulesToInstall: PrebuiltRuleAsset[]
): RuleInstallationInfoForReview[] => {
  return rulesToInstall.map((rule) => convertRuleToDiffable(rule));
};
