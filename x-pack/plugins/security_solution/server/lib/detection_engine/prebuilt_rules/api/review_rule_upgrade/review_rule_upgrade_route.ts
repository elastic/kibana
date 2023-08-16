/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { pickBy } from 'lodash';
import { REVIEW_RULE_UPGRADE_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type {
  ReviewRuleUpgradeResponseBody,
  RuleUpgradeInfoForReview,
  RuleUpgradeStatsForReview,
  ThreeWayDiff,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { invariant } from '../../../../../../common/utils/invariant';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import type { CalculateRuleDiffResult } from '../../logic/diff/calculate_rule_diff';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../logic/rule_versions/fetch_rule_versions_triad';
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

        const ruleVersionsMap = await fetchRuleVersionsTriad({
          ruleAssetsClient,
          ruleObjectsClient,
        });
        const { upgradeableRules } = getVersionBuckets(ruleVersionsMap);

        const ruleDiffCalculationResults = upgradeableRules.map(({ current }) => {
          const ruleVersions = ruleVersionsMap.get(current.rule_id);
          invariant(ruleVersions != null, 'ruleVersions not found');
          return calculateRuleDiff(ruleVersions);
        });

        const body: ReviewRuleUpgradeResponseBody = {
          stats: calculateRuleStats(ruleDiffCalculationResults),
          rules: calculateRuleInfos(ruleDiffCalculationResults),
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

const calculateRuleStats = (results: CalculateRuleDiffResult[]): RuleUpgradeStatsForReview => {
  const allTags = new Set<string>(
    results.flatMap((result) => result.ruleVersions.input.current?.tags ?? [])
  );
  return {
    num_rules_to_upgrade_total: results.length,
    tags: [...allTags].sort((a, b) => a.localeCompare(b)),
  };
};

const calculateRuleInfos = (results: CalculateRuleDiffResult[]): RuleUpgradeInfoForReview[] => {
  return results.map((result) => {
    const { ruleDiff, ruleVersions } = result;
    const installedCurrentVersion = ruleVersions.input.current;
    const diffableCurrentVersion = ruleVersions.output.current;
    const diffableTargetVersion = ruleVersions.output.target;
    invariant(installedCurrentVersion != null, 'installedCurrentVersion not found');

    return {
      id: installedCurrentVersion.id,
      rule_id: installedCurrentVersion.rule_id,
      revision: installedCurrentVersion.revision,
      rule: diffableCurrentVersion,
      target_rule: diffableTargetVersion,
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
