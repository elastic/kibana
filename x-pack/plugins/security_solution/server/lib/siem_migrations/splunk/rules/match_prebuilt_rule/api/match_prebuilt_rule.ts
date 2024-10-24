/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { SplunkRuleMigrationMatchPrebuiltRuleRequestBody } from '../../../../../../../common/api/siem_migrations/splunk/rules/match_prebuilt_rule.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { SPLUNK_MATCH_PREBUILT_RULE_PATH } from '../../../../../../../common/api/siem_migrations/splunk/rules/constants';
import { retrievePrebuiltRulesMap } from './util/prebuilt_rules';
import { getMatchPrebuiltRuleGraph } from '../agent/graph';
import type { MatchPrebuiltRuleState } from '../agent/types';
import type { PrebuiltRuleMapped } from '../types';
import { ActionsClientChat } from '../../../../actions_client_chat';

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
      async (context, request, response): Promise<IKibanaResponse<PrebuiltRuleMapped>> => {
        const { langSmithOptions, splunkRule, connectorId } = request.body;
        try {
          const ctx = await context.resolve(['core', 'actions', 'alerting']);

          const actionsClient = ctx.actions.getActionsClient();
          const soClient = ctx.core.savedObjects.client;
          const rulesClient = ctx.alerting.getRulesClient();

          const prebuiltRulesMap = await retrievePrebuiltRulesMap({
            soClient,
            rulesClient,
            splunkRule,
          });

          const actionsClientChat = new ActionsClientChat(connectorId, actionsClient, logger);
          const model = await actionsClientChat.createModel({
            signal: getRequestAbortedSignal(request.events.aborted$),
            temperature: 0.05,
          });

          const parameters: Partial<MatchPrebuiltRuleState> = {
            splunkRuleTitle: splunkRule.title,
            splunkRuleDescription: splunkRule.description,
            prebuiltRulesMap,
          };

          const options = {
            callbacks: [
              new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
              ...getLangSmithTracer({ ...langSmithOptions, logger }),
            ],
          };
          const graph = await getMatchPrebuiltRuleGraph({ model });
          const matchPrebuiltRuleState = await graph.invoke(parameters, options);

          const { matched, result } = matchPrebuiltRuleState as MatchPrebuiltRuleState;
          if (!matched) {
            return response.noContent();
          }
          return response.ok({ body: result });
        } catch (err) {
          return response.badRequest({
            body: err.message,
          });
        }
      }
    );
};
