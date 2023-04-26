/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy } from 'lodash';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { REVIEW_RULE_UPGRADE_URL } from '../../../../../../common/detection_engine/prebuilt_rules';
import type {
  ReviewRuleUpgradeResponseBody,
  RuleUpgradeInfoForReview,
  RuleUpgradeStatsForReview,
} from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_upgrade/response_schema';
import type { PrebuiltRuleVersionInfo } from '../../model/rule_versions/prebuilt_rule_version_info';
import type {
  CalculateRuleDiffArgs,
  CalculateRuleDiffResult,
} from '../../logic/diff/calculate_rule_diff';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import type { ThreeWayDiff } from '../../../../../../common/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_diff';
import type { RuleResponse } from '../../../../../../common/detection_engine/rule_schema';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';

import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { getVersionBuckets } from '../../model/rule_versions/get_version_buckets';

export const reviewRuleUpgradeRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: REVIEW_RULE_UPGRADE_URL,
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

        const [latestVersions, { installedVersions, installedRules }] = await Promise.all([
          ruleAssetsClient.fetchLatestVersions(),
          ruleObjectsClient.fetchInstalledRules(),
        ]);

        const versionBuckets = getVersionBuckets({
          latestVersions,
          installedVersions,
        });

        const [baseRules, latestRules] = await Promise.all([
          ruleAssetsClient.fetchAssetsByVersionInfo(versionBuckets.installedVersionsToUpgrade),
          ruleAssetsClient.fetchAssetsByVersionInfo(versionBuckets.latestVersionsToUpgrade),
        ]);

        const ruleDiffCalculationArgs = getRuleDiffCalculationArgs(
          versionBuckets.installedVersionsToUpgrade,
          installedRules,
          baseRules,
          latestRules
        );
        const ruleDiffCalculationResults = ruleDiffCalculationArgs.map((args) => {
          return calculateRuleDiff(args);
        });

        const body: ReviewRuleUpgradeResponseBody = {
          status_code: 200,
          message: 'OK',
          attributes: {
            stats: calculateRuleStats(ruleDiffCalculationResults),
            rules: calculateRuleInfos(ruleDiffCalculationResults),
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

const getRuleDiffCalculationArgs = (
  installedVersionsToUpgrade: PrebuiltRuleVersionInfo[],
  installedRules: RuleResponse[],
  baseRules: PrebuiltRuleAsset[],
  latestRules: PrebuiltRuleAsset[]
): CalculateRuleDiffArgs[] => {
  const installedRulesMap = new Map(installedRules.map((r) => [r.rule_id, r]));
  const baseRulesMap = new Map(baseRules.map((r) => [r.rule_id, r]));
  const latestRulesMap = new Map(latestRules.map((r) => [r.rule_id, r]));

  const result: CalculateRuleDiffArgs[] = [];

  installedVersionsToUpgrade.forEach((versionToUpgrade) => {
    const ruleId = versionToUpgrade.rule_id;
    const installedRule = installedRulesMap.get(ruleId);
    const baseRule = baseRulesMap.get(ruleId);
    const latestRule = latestRulesMap.get(ruleId);

    // TODO: https://github.com/elastic/kibana/issues/148189
    // Make base versions optional for diff calculation. We need to support this in order to be able
    // to still show diffs for rule assets coming from packages without historical versions.
    if (installedRule != null && baseRule != null && latestRule != null) {
      result.push({
        currentVersion: installedRule,
        baseVersion: baseRule,
        targetVersion: latestRule,
      });
    }
  });

  return result;
};

const calculateRuleStats = (results: CalculateRuleDiffResult[]): RuleUpgradeStatsForReview => {
  return {
    num_rules_to_upgrade_total: results.length,
    num_rules_to_upgrade_not_customized: results.length,
    num_rules_to_upgrade_customized: 0,
    tags: [],
    fields: [],
  };
};

const calculateRuleInfos = (results: CalculateRuleDiffResult[]): RuleUpgradeInfoForReview[] => {
  return results.map((result) => {
    const { ruleDiff, ruleVersions } = result;
    const installedCurrentVersion = ruleVersions.input.current;
    const diffableCurrentVersion = ruleVersions.output.current;

    return {
      id: installedCurrentVersion.id,
      rule_id: installedCurrentVersion.rule_id,
      rule: diffableCurrentVersion,
      diff: {
        fields: pickBy<ThreeWayDiff<unknown>>(
          ruleDiff.fields,
          (fieldDiff) => fieldDiff.has_update || fieldDiff.has_conflict
        ),
        has_conflict: ruleDiff.has_conflict,
      },
    };
  });
};
