/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { pickBy } from 'lodash';
import {
  REVIEW_RULE_UPGRADE_URL,
  ThreeWayDiffOutcome,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type {
  ReviewRuleUpgradeResponseBody,
  RuleUpgradeInfoForReview,
  RuleUpgradeStatsForReview,
  ThreeWayDiff,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { invariant } from '../../../../../../common/utils/invariant';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import type { CalculateRuleDiffResult } from '../../logic/diff/calculate_rule_diff';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../logic/rule_versions/fetch_rule_versions_triad';
import { getVersionBuckets } from '../../model/rule_versions/get_version_buckets';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/normalization/rule_converters';
import { PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS } from '../../constants';

export const reviewRuleUpgradeRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: REVIEW_RULE_UPGRADE_URL,
      options: {
        tags: ['access:securitySolution'],
        timeout: {
          idleSocket: PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
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
    const targetVersion = ruleVersions.input.target;
    invariant(installedCurrentVersion != null, 'installedCurrentVersion not found');
    invariant(targetVersion != null, 'targetVersion not found');

    const targetRule: RuleResponse = {
      ...convertPrebuiltRuleAssetToRuleResponse(targetVersion),
      id: installedCurrentVersion.id,
      revision: installedCurrentVersion.revision + 1,
      created_at: installedCurrentVersion.created_at,
      created_by: installedCurrentVersion.created_by,
      updated_at: new Date().toISOString(),
      updated_by: installedCurrentVersion.updated_by,
    };

    return {
      id: installedCurrentVersion.id,
      rule_id: installedCurrentVersion.rule_id,
      revision: installedCurrentVersion.revision,
      current_rule: installedCurrentVersion,
      target_rule: targetRule,
      diff: {
        fields: pickBy<ThreeWayDiff<unknown>>(
          ruleDiff.fields,
          (fieldDiff) => fieldDiff.diff_outcome !== ThreeWayDiffOutcome.StockValueNoUpdate
        ),
        has_conflict: ruleDiff.has_conflict,
      },
    };
  });
};
