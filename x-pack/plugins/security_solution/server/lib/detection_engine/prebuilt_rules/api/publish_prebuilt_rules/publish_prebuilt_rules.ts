/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { PUBLISH_PREBUILT_RULES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  PublishPrebuiltRulesRequestBody,
  type PublishPrebuiltRulesResponse,
} from '../../../../../../common/api/detection_engine/prebuilt_rules/publish_prebuilt_rules/publish_prebuilt_rules.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { commitRulesToRepository } from './commit_rules_to_repository';

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

          const repositoriesById = new Map(
            config.prebuiltRuleRepositories.map((repository) => [repository.id, repository])
          );

          const rulesClient = ctx.alerting.getRulesClient();
          const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

          const rulesToPublish = request.body.rules;
          const currentRules = await ruleObjectsClient.fetchInstalledRulesByIds(
            rulesToPublish.map((rule) => rule.rule_id)
          );
          const currentRulesById = new Map(currentRules.map((rule) => [rule.rule_id, rule]));

          const rulesByRepository: Record<string, RuleResponse[]> = {};
          // Check that the rule revisions match the ones provided in the request
          rulesToPublish.forEach((rule) => {
            const currentRule = currentRulesById.get(rule.rule_id);
            if (currentRule == null) {
              throw new Error(`Rule with rule_id ${rule.rule_id} not found`);
            }
            if (currentRule.rule_source?.type !== 'external') {
              throw new Error(`Rule with id ${rule.rule_id} is not a prebuilt rule`);
            }
            const repositoryId = currentRule.rule_source?.repository_id;
            if (!repositoryId) {
              throw new Error(`repository_id is missing for rule with id ${rule.rule_id}`);
            }
            if (!repositoriesById.has(repositoryId)) {
              throw new Error(
                `Rule with id ${rule.rule_id} is associated with an unknown repository`
              );
            }

            if (currentRule.revision !== rule.revision) {
              throw new Error(
                `Revision mismatch for rule with id ${rule.rule_id}: expected ${currentRule.revision}, got ${rule.revision}`
              );
            }

            rulesByRepository[repositoryId] = [
              ...(rulesByRepository[repositoryId] ?? []),
              currentRule,
            ];
          });

          await Promise.all(
            Object.entries(rulesByRepository).map(([repositoryId, rules]) => {
              return commitRulesToRepository({
                repository: repositoriesById.get(repositoryId),
                rules,
              });
            })
          );

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
