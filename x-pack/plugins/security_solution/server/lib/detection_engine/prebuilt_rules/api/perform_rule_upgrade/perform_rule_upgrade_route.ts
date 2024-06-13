/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  PERFORM_RULE_UPGRADE_URL,
  SkipRuleUpgradeReason,
  PerformRuleUpgradeRequestBody,
  PickVersionValues,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type {
  PerformRuleUpgradeResponseBody,
  SkippedRuleUpgrade,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { assertUnreachable } from '../../../../../../common/utility_types';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import type { PromisePoolError } from '../../../../../utils/promise_pool';
import { buildSiemResponse } from '../../../routes/utils';
import { internalRuleToAPIResponse } from '../../../rule_management/normalization/rule_converters';
import { aggregatePrebuiltRuleErrors } from '../../logic/aggregate_prebuilt_rule_errors';
import { performTimelinesInstallation } from '../../logic/perform_timelines_installation';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { upgradePrebuiltRules } from '../../logic/rule_objects/upgrade_prebuilt_rules';
import { fetchRuleVersionsTriad } from '../../logic/rule_versions/fetch_rule_versions_triad';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { getVersionBuckets } from '../../model/rule_versions/get_version_buckets';
import { PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS } from '../../constants';

export const performRuleUpgradeRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: PERFORM_RULE_UPGRADE_URL,
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
        validate: {
          request: {
            body: buildRouteValidation(PerformRuleUpgradeRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
          const soClient = ctx.core.savedObjects.client;
          const rulesClient = ctx.alerting.getRulesClient();
          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
          const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
          const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

          const { mode, pick_version: globalPickVersion = PickVersionValues.TARGET } = request.body;

          const fetchErrors: Array<PromisePoolError<{ rule_id: string }>> = [];
          const targetRules: PrebuiltRuleAsset[] = [];
          const skippedRules: SkippedRuleUpgrade[] = [];

          const versionSpecifiers = mode === 'ALL_RULES' ? undefined : request.body.rules;
          const versionSpecifiersMap = new Map(
            versionSpecifiers?.map((rule) => [rule.rule_id, rule])
          );
          const ruleVersionsMap = await fetchRuleVersionsTriad({
            ruleAssetsClient,
            ruleObjectsClient,
            versionSpecifiers,
          });
          const versionBuckets = getVersionBuckets(ruleVersionsMap);
          const { currentRules } = versionBuckets;
          // The upgradeable rules list is mutable; we can remove rules from it because of version mismatch
          let upgradeableRules = versionBuckets.upgradeableRules;

          // Perform all the checks we can before we start the upgrade process
          if (mode === 'SPECIFIC_RULES') {
            const installedRuleIds = new Set(currentRules.map((rule) => rule.rule_id));
            const upgradeableRuleIds = new Set(
              upgradeableRules.map(({ current }) => current.rule_id)
            );
            request.body.rules.forEach((rule) => {
              // Check that the requested rule was found
              if (!installedRuleIds.has(rule.rule_id)) {
                fetchErrors.push({
                  error: new Error(
                    `Rule with ID "${rule.rule_id}" and version "${rule.version}" not found`
                  ),
                  item: rule,
                });
                return;
              }

              // Check that the requested rule is upgradeable
              if (!upgradeableRuleIds.has(rule.rule_id)) {
                skippedRules.push({
                  rule_id: rule.rule_id,
                  reason: SkipRuleUpgradeReason.RULE_UP_TO_DATE,
                });
                return;
              }

              // Check that rule revisions match (no update slipped in since the user reviewed the list)
              const currentRevision = ruleVersionsMap.get(rule.rule_id)?.current?.revision;
              if (rule.revision !== currentRevision) {
                fetchErrors.push({
                  error: new Error(
                    `Revision mismatch for rule ID ${rule.rule_id}: expected ${rule.revision}, got ${currentRevision}`
                  ),
                  item: rule,
                });
                // Remove the rule from the list of upgradeable rules
                upgradeableRules = upgradeableRules.filter(
                  ({ current }) => current.rule_id !== rule.rule_id
                );
              }
            });
          }

          // Construct the list of target rule versions
          upgradeableRules.forEach(({ current, target }) => {
            const rulePickVersion =
              versionSpecifiersMap?.get(current.rule_id)?.pick_version ?? globalPickVersion;
            switch (rulePickVersion) {
              case PickVersionValues.BASE:
                const baseVersion = ruleVersionsMap.get(current.rule_id)?.base;
                if (baseVersion) {
                  targetRules.push({ ...baseVersion, version: target.version });
                } else {
                  fetchErrors.push({
                    error: new Error(`Could not find base version for rule ${current.rule_id}`),
                    item: current,
                  });
                }
                break;
              case PickVersionValues.CURRENT:
                targetRules.push({ ...current, version: target.version });
                break;
              case PickVersionValues.TARGET:
                targetRules.push(target);
                break;
              default:
                assertUnreachable(rulePickVersion);
            }
          });

          // Perform the upgrade
          const { results: updatedRules, errors: installationErrors } = await upgradePrebuiltRules(
            detectionRulesClient,
            targetRules
          );
          const ruleErrors = [...fetchErrors, ...installationErrors];

          const { error: timelineInstallationError } = await performTimelinesInstallation(
            ctx.securitySolution
          );

          const allErrors = aggregatePrebuiltRuleErrors(ruleErrors);
          if (timelineInstallationError) {
            allErrors.push({
              message: timelineInstallationError,
              rules: [],
            });
          }

          const body: PerformRuleUpgradeResponseBody = {
            summary: {
              total: updatedRules.length + skippedRules.length + ruleErrors.length,
              skipped: skippedRules.length,
              succeeded: updatedRules.length,
              failed: ruleErrors.length,
            },
            results: {
              updated: updatedRules.map(({ result }) => internalRuleToAPIResponse(result)),
              skipped: skippedRules,
            },
            errors: allErrors,
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
