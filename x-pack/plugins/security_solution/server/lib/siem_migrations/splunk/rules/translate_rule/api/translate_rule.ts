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
import type { SplunkRuleMigrationTranslateRuleResponse } from '../../../../../../../common/api/siem_migrations/splunk/rules/translate_rule.gen';
import { SplunkRuleMigrationTranslateRuleRequestBody } from '../../../../../../../common/api/siem_migrations/splunk/rules/translate_rule.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { SPLUNK_TRANSLATE_RULE_PATH } from '../../../../../../../common/api/siem_migrations/splunk/rules/constants';
import { getTranslateRuleGraph } from '../agent/graph';
import type { TranslateRuleState } from '../agent/types';
import { ActionsClientChat } from '../../../../actions_client_chat';
import { getEsqlTranslatorTool } from '../agent/tools/esql_translator_tool';

type SplunkTranslateRuleRouteResponse = IKibanaResponse<SplunkRuleMigrationTranslateRuleResponse>;

export const registerSplunkTranslateRuleRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SPLUNK_TRANSLATE_RULE_PATH,
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
            body: buildRouteValidationWithZod(SplunkRuleMigrationTranslateRuleRequestBody),
          },
        },
      },
      async (context, req, res): Promise<SplunkTranslateRuleRouteResponse> => {
        const { langSmithOptions, splunkRule, connectorId } = req.body;
        try {
          const ctx = await context.resolve(['core', 'actions', 'securitySolution']);

          const inferenceClient = ctx.securitySolution.getInferenceClient({ request: req });
          const esqlTranslatorTool = getEsqlTranslatorTool({
            inferenceClient,
            connectorId,
            logger,
          });

          const actionsClient = ctx.actions.getActionsClient();
          const actionsClientChat = new ActionsClientChat(connectorId, actionsClient, logger);
          const model = await actionsClientChat.createModel({
            signal: getRequestAbortedSignal(req.events.aborted$),
            temperature: 0.05,
          });

          const parameters: Partial<TranslateRuleState> = {
            splunkRuleTitle: splunkRule.title,
            splunkRuleDescription: splunkRule.description,
            splunkRuleQuery: splunkRule.splSearch,
          };

          const options = {
            callbacks: [
              new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
              ...getLangSmithTracer({ ...langSmithOptions, logger }),
            ],
          };
          const graph = getTranslateRuleGraph({ model, tools: [esqlTranslatorTool] });
          const translateRuleState = await graph.invoke(parameters, options);

          // const { response, messages } = translateRuleState as TranslateRuleState;
          // const migration: SplunkRuleMigration = {
          //   ...splunkRule,
          //   uuid: '1234',
          //   elasticQuery: response,
          //   elasticQueryLanguage: 'esql',
          //   status: 'finished',
          //   translationState: 'translated:complete',
          //   summary: 'This is a summary',
          //   messages,
          // };

          return res.ok({ body: { messages: translateRuleState.messages } });
        } catch (err) {
          return res.badRequest({
            body: err.message,
          });
        }
      }
    );
};
