/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import { GET_PREBUILT_RULES_STATUS_URL } from '../../../../../../common/detection_engine/prebuilt_rules';
import type {
  GetPrebuiltRulesStatusResponseBody,
  PrebuiltRulesStatusStats,
} from '../../../../../../common/detection_engine/prebuilt_rules/api/get_prebuilt_rules_status/response_schema';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';

import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import type { VersionBuckets } from '../../model/rule_versions/get_version_buckets';
import { getVersionBuckets } from '../../model/rule_versions/get_version_buckets';

export const getPrebuiltRulesStatusRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: GET_PREBUILT_RULES_STATUS_URL,
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
  };
};
