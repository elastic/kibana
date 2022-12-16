/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { REVIEW_RULE_INSTALLATION_URL } from '../../../../../../common/detection_engine/prebuilt_rules';
import { ReviewRuleInstallationRequestBody } from '../../../../../../common/detection_engine/prebuilt_rules/poc/api/review_rule_installation/request_schema';
import type {
  ReviewRuleInstallationResponseBody,
  RuleInstallationInfoForReview,
  RuleInstallationStatsForReview,
} from '../../../../../../common/detection_engine/prebuilt_rules/poc/api/review_rule_installation/response_schema';
import type { PrebuiltRuleContent } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_content';
import { convertRuleToDiffable } from '../../../../../../common/detection_engine/prebuilt_rules/poc/diff_algorithm/normalization/convert_rule_to_diffable';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../routes/utils';
import { getVersionBuckets } from '../../logic/poc/get_versions_to_install_and_upgrade';

import { createPrebuiltRuleContentClient } from '../../logic/poc/prebuilt_rule_content_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/poc/prebuilt_rule_objects_client';
import { createComposite2RuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_composite2_saved_objects_client';
import { createCompositeRuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_composite_saved_objects_client';
import { createFlatRuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_flat_saved_objects_client';

export const reviewRuleInstallationRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.post(
    {
      path: REVIEW_RULE_INSTALLATION_URL,
      validate: {
        body: buildRouteValidation(ReviewRuleInstallationRequestBody),
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

        const [latestVersions, installedVersions] = await Promise.all([
          ruleContentClient.fetchLatestVersions(request.body.data_model),
          ruleObjectsClient.fetchInstalledVersions(),
        ]);

        const versionBuckets = getVersionBuckets({
          latestVersions,
          installedVersions,
        });

        const rulesToInstall = await ruleContentClient.fetchRulesByVersionInfo(
          request.body.data_model,
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

const getAggregatedTags = (rules: PrebuiltRuleContent[]): string[] => {
  const set = new Set<string>();

  rules.forEach((rule) => {
    (rule.tags ?? []).forEach((tag) => {
      set.add(tag);
    });
  });

  return Array.from(set.values());
};

const calculateRuleStats = (
  rulesToInstall: PrebuiltRuleContent[]
): RuleInstallationStatsForReview => {
  const tagsOfRulesToInstall = getAggregatedTags(rulesToInstall);
  return {
    num_rules_to_install: rulesToInstall.length,
    tags: tagsOfRulesToInstall,
  };
};

const calculateRuleInfos = (
  rulesToInstall: PrebuiltRuleContent[]
): RuleInstallationInfoForReview[] => {
  return rulesToInstall.map((rule) => convertRuleToDiffable(rule));
};
