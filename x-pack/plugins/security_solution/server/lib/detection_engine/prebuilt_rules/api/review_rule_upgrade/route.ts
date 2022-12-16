/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { REVIEW_RULE_UPGRADE_URL } from '../../../../../../common/detection_engine/prebuilt_rules';
import { ReviewRuleUpgradeRequestBody } from '../../../../../../common/detection_engine/prebuilt_rules/poc/api/review_rule_upgrade/request_schema';
import type {
  ReviewRuleUpgradeResponseBody,
  RuleUpgradeInfoForReview,
  RuleUpgradeStatsForReview,
} from '../../../../../../common/detection_engine/prebuilt_rules/poc/api/review_rule_upgrade/response_schema';
import type { PrebuiltRuleContent } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_content';
import type { PrebuiltRuleVersionInfo } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_version_info';
import type {
  CalculateRuleDiffArgs,
  CalculateRuleDiffResult,
} from '../../../../../../common/detection_engine/prebuilt_rules/poc/diff_algorithm/calculate_rule_diff';
import { calculateRuleDiff } from '../../../../../../common/detection_engine/prebuilt_rules/poc/diff_algorithm/calculate_rule_diff';
import type { ThreeWayDiff } from '../../../../../../common/detection_engine/prebuilt_rules/poc/diff_model/three_way_diff';
import type { RuleResponse } from '../../../../../../common/detection_engine/rule_schema';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../routes/utils';

import { createPrebuiltRuleContentClient } from '../../logic/poc/prebuilt_rule_content_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/poc/prebuilt_rule_objects_client';
import { createCompositeRuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_composite_saved_objects_client';
import { createComposite2RuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_composite2_saved_objects_client';
import { createFlatRuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_flat_saved_objects_client';
import { getVersionBuckets } from '../../logic/poc/get_versions_to_install_and_upgrade';

export const reviewRuleUpgradeRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.post(
    {
      path: REVIEW_RULE_UPGRADE_URL,
      validate: {
        body: buildRouteValidation(ReviewRuleUpgradeRequestBody),
      },
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
        const flatClient = createFlatRuleAssetsClient(soClient);
        const compositeClient = createCompositeRuleAssetsClient(soClient);
        const composite2Client = createComposite2RuleAssetsClient(soClient);
        const ruleContentClient = createPrebuiltRuleContentClient(
          flatClient,
          compositeClient,
          composite2Client
        );
        const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient, soClient, logger);

        const [latestVersions, { installedVersions, installedRules }] = await Promise.all([
          ruleContentClient.fetchLatestVersions(request.body.data_model),
          ruleObjectsClient.fetchInstalledRules(),
        ]);

        const versionBuckets = getVersionBuckets({
          latestVersions,
          installedVersions,
        });

        const [baseRules, latestRules] = await Promise.all([
          ruleContentClient.fetchRulesByVersionInfo(
            request.body.data_model,
            versionBuckets.installedVersionsToUpgrade
          ),
          ruleContentClient.fetchRulesByVersionInfo(
            request.body.data_model,
            versionBuckets.latestVersionsToUpgrade
          ),
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
  baseRules: PrebuiltRuleContent[],
  latestRules: PrebuiltRuleContent[]
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
    num_rules_to_upgrade: results.length,
    num_stock_rules_to_upgrade: results.length,
    num_customized_rules_to_upgrade: 0,
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
          (fieldDiff) => fieldDiff.has_value_changed || fieldDiff.has_conflict
        ),
        has_conflict: ruleDiff.has_conflict,
      },
    };
  });
};
