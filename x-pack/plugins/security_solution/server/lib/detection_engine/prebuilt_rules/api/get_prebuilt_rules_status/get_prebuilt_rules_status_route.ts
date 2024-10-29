/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_PREBUILT_RULES_STATUS_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { GetPrebuiltRulesStatusResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../logic/rule_versions/fetch_rule_versions_triad';
import { getRuleGroups } from '../../model/rule_groups/get_rule_groups';

export const getPrebuiltRulesStatusRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_PREBUILT_RULES_STATUS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
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
          const { currentRules, installableRules, upgradeableRules, totalAvailableRules } =
            getRuleGroups(ruleVersionsMap);

          const body: GetPrebuiltRulesStatusResponseBody = {
            stats: {
              num_prebuilt_rules_installed: currentRules.length,
              num_prebuilt_rules_to_install: installableRules.length,
              num_prebuilt_rules_to_upgrade: upgradeableRules.length,
              num_prebuilt_rules_total_in_package: totalAvailableRules.length,
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
