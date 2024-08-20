/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { PUBLISH_PREBUILT_RULES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  PublishPrebuiltRulesRequestBody,
  type PublishPrebuiltRulesResponse,
} from '../../../../../../common/api/detection_engine/prebuilt_rules/publish_prebuilt_rules/publish_prebuilt_rules.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';

export const publishPrebuiltRulesRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: PUBLISH_PREBUILT_RULES_URL,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(PublishPrebuiltRulesRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PublishPrebuiltRulesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['securitySolution', 'alerting']);
          const securityContext = ctx.securitySolution;
          const config = securityContext.getConfig();

          if (!config.prebuiltRuleRepositories) {
            return siemResponse.error({
              body: 'Prebuilt rule repositories are not configured',
              statusCode: 400,
            });
          }

          const rulesClient = ctx.alerting.getRulesClient();
          const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

          const rulesToPublish = request.body.rules;
          const currentRules = await ruleObjectsClient.fetchInstalledRulesByIds(
            rulesToPublish.map((rule) => rule.rule_id)
          );
          const currentRulesById = new Map(currentRules.map((rule) => [rule.id, rule]));

          // Check that the rule revisions match the ones provided in the request
          rulesToPublish.forEach((rule) => {
            const currentRule = currentRulesById.get(rule.rule_id);
            if (currentRule == null) {
              throw new Error(`Rule with rule_id ${rule.rule_id} not found`);
            }
            if (currentRule.rule_source?.type !== 'external') {
              throw new Error(`Rule with id ${rule.rule_id} is not a prebuilt rule`);
            }
            if (currentRule.revision !== rule.revision) {
              throw new Error(
                `Revision mismatch for rule with id ${rule.rule_id}: expected ${currentRule.revision}, got ${rule.revision}`
              );
            }
          });

          const responseBody: PublishPrebuiltRulesResponse = {
            published_rules: [],
          };

          return response.ok({
            body: responseBody,
          });
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
