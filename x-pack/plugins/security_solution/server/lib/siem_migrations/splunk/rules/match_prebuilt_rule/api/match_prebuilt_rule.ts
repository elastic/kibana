/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
// import { getVersionBuckets } from '../../../../../detection_engine/prebuilt_rules/model/rule_versions/get_version_buckets';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import type { SplunkRuleMigrationMatchPrebuiltRuleResponse } from '../../../../../../../common/api/siem_migrations/splunk/rules/match_prebuilt_rule.gen';
import { SplunkRuleMigrationMatchPrebuiltRuleRequestBody } from '../../../../../../../common/api/siem_migrations/splunk/rules/match_prebuilt_rule.gen';
import { fetchRuleVersionsTriad } from '../../../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad';
import { createPrebuiltRuleObjectsClient } from '../../../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRuleAssetsClient } from '../../../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { SPLUNK_MATCH_PREBUILT_RULE_PATH } from '../../../../../../../common/api/siem_migrations/splunk/rules/constants';
import { getLLMType, getLLMClass } from '../../../../util/llm';

export const registerSplunkMatchPrebuiltRuleRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SPLUNK_MATCH_PREBUILT_RULE_PATH,
      access: 'internal',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SplunkRuleMigrationMatchPrebuiltRuleRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<SplunkRuleMigrationMatchPrebuiltRuleResponse>> => {
        const { langSmithOptions, rule: splunkRule, connectorId } = request.body;
        try {
          const ctx = await context.resolve(['core', 'actions', 'alerting']);

          const actionsClient = ctx.actions.getActionsClient();
          const connector = await actionsClient.get({ id: connectorId });

          const abortSignal = getRequestAbortedSignal(request.events.aborted$);

          const soClient = ctx.core.savedObjects.client;
          const rulesClient = ctx.alerting.getRulesClient();

          const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
          const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

          const prebuiltRulesMap = await fetchRuleVersionsTriad({
            ruleAssetsClient,
            ruleObjectsClient,
          });

          // prebuiltRulesMap.forEach(({ current, target }) => {
          //   if (target != null) {
          //     // If this rule is available in the package
          //     totalAvailableRules.push(target);
          //   }

          //   if (current != null) {
          //     // If this rule is installed
          //     currentRules.push(current);
          //   }

          //   if (current == null && target != null) {
          //     // If this rule is not installed
          //     installableRules.push(target);
          //   }

          //   if (current != null && target != null && current.version < target.version) {
          //     // If this rule is installed but outdated
          //     upgradeableRules.push({
          //       current,
          //       target,
          //     });
          //   }
          // });

          const actionTypeId = connector.actionTypeId;
          const llmType = getLLMType(actionTypeId);
          const llmClass = getLLMClass(llmType);

          const model = new llmClass({
            actionsClient,
            connectorId: connector.id,
            logger,
            llmType,
            model: connector.config?.defaultModel,
            temperature: 0.05,
            maxTokens: 16385, // 4096,
            signal: abortSignal,
            streaming: false,
          });

          const parameters = {
            ruleTitle: splunkRule.title,
            ruleDescription: splunkRule.description,
          };

          const options = {
            callbacks: [
              new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
              ...getLangSmithTracer({ ...langSmithOptions, logger }),
            ],
          };

          const graph = await getMatchPrebuiltRuleGraph({ model });
          const results = await graph.invoke(parameters, options);

          const ruleMatched = false;

          if (!ruleMatched) {
            return response.noContent();
          }
          return response.ok({ body: { id: '1', name: 'dummy', installed: true } });
        } catch (err) {
          return response.badRequest({
            body: err.message,
          });
        }
      }
    );
};
