/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { GET_PREBUILT_RULES_STATUS_URL } from '../../../../../../common/detection_engine/prebuilt_rules';
import { GetPrebuiltRulesStatusRequestQuery } from '../../../../../../common/detection_engine/prebuilt_rules/poc/api/get_prebuilt_rules_status/request_schema';
import type {
  GetPrebuiltRulesStatusResponseBody,
  PrebuiltRulesStatusStats,
} from '../../../../../../common/detection_engine/prebuilt_rules/poc/api/get_prebuilt_rules_status/response_schema';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../routes/utils';

import { createCompositeRuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_composite_saved_objects_client';
import { createComposite2RuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_composite2_saved_objects_client';
import { createFlatRuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_flat_saved_objects_client';
import { createPrebuiltRuleContentClient } from '../../logic/poc/prebuilt_rule_content_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/poc/prebuilt_rule_objects_client';
import type { VersionBuckets } from '../../logic/poc/get_versions_to_install_and_upgrade';
import { getVersionBuckets } from '../../logic/poc/get_versions_to_install_and_upgrade';

export const getPrebuiltRulesStatusRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.get(
    {
      path: GET_PREBUILT_RULES_STATUS_URL,
      validate: {
        query: buildRouteValidation(GetPrebuiltRulesStatusRequestQuery),
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
          ruleContentClient.fetchLatestVersions(request.query.data_model),
          ruleObjectsClient.fetchInstalledVersions(),
        ]);

        const versionBuckets = getVersionBuckets({
          latestVersions,
          installedVersions,
        });

        const stats = calculateRuleStats(versionBuckets);

        const body: GetPrebuiltRulesStatusResponseBody = {
          status_code: 200,
          message: 'OK',
          attributes: {
            stats,
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

const calculateRuleStats = (buckets: VersionBuckets): PrebuiltRulesStatusStats => {
  const { latestVersions, installedVersions, latestVersionsToInstall, installedVersionsToUpgrade } =
    buckets;

  return {
    num_prebuilt_rules_total: latestVersions.length,
    num_prebuilt_rules_installed: installedVersions.length,
    num_prebuilt_rules_to_install: latestVersionsToInstall.length,
    num_prebuilt_rules_to_upgrade: installedVersionsToUpgrade.length,
    rule_ids_to_install: latestVersionsToInstall.map((r) => r.rule_id),
    rule_ids_to_upgrade: installedVersionsToUpgrade.map((r) => r.rule_id),
  };
};
