/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { Logger } from '@kbn/core/server';
import { queryRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/query_rules_type_dependents';
import {
  queryRulesSchema,
  QueryRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/query_rules_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getIdError, transform } from './utils';
import { buildSiemResponse } from '../utils';

import { readRules } from '../../rules/read_rules';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActionsSavedObject } from '../../rule_actions/legacy_get_rule_actions_saved_object';

export const readRulesRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        query: buildRouteValidation<typeof queryRulesSchema, QueryRulesSchemaDecoded>(
          queryRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = queryRuleValidateTypeDependents(request.query);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      const { id, rule_id: ruleId } = request.query;

      try {
        const rulesClient = (await context.alerting).getRulesClient();
        const ruleExecutionLog = (await context.securitySolution).getRuleExecutionLog();
        const savedObjectsClient = (await context.core).savedObjects.client;

        const rule = await readRules({
          id,
          rulesClient,
          ruleId,
        });
        if (rule != null) {
          const legacyRuleActions = await legacyGetRuleActionsSavedObject({
            savedObjectsClient,
            ruleAlertId: rule.id,
            logger,
          });

          const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(rule.id);

          const transformed = transform(rule, ruleExecutionSummary, legacyRuleActions);
          if (transformed == null) {
            return siemResponse.error({ statusCode: 500, body: 'Internal error transforming' });
          } else {
            transformed.setup =
              "## Config\n\nThe 'Audit Detailed File Share' audit policy must be configured (Success Failure).\nSteps to implement the logging policy with with Advanced Audit Configuration:\n\n```\nComputer Configuration > \nPolicies > \nWindows Settings > \nSecurity Settings > \nAdvanced Audit Policies Configuration > \nAudit Policies > \nObject Access > \nAudit Detailed File Share (Success,Failure)\n```\n\nThe 'Audit Directory Service Changes' audit policy must be configured (Success Failure).\nSteps to implement the logging policy with with Advanced Audit Configuration:\n\n```\nComputer Configuration > \nPolicies > \nWindows Settings > \nSecurity Settings > \nAdvanced Audit Policies Configuration > \nAudit Policies > \nDS Access > \nAudit Directory Service Changes (Success,Failure)\n```\n";
            transformed.required_fields = [
              {
                name: 'event.code',
                type: 'keyword',
                ecs: true,
              },
              {
                name: 'message',
                type: 'match_only_text',
                ecs: true,
              },
              {
                name: 'winlog.event_data.AttributeLDAPDisplayName',
                type: 'keyword',
                ecs: false,
              },
              {
                name: 'winlog.event_data.AttributeValue',
                type: 'keyword',
                ecs: false,
              },
              {
                name: 'winlog.event_data.ShareName',
                type: 'keyword',
                ecs: false,
              },
              {
                name: 'winlog.event_data.RelativeTargetName',
                type: 'keyword',
                ecs: false,
              },
              {
                name: 'winlog.event_data.AccessList',
                type: 'keyword',
                ecs: false,
              },
            ];
            transformed.related_integrations = [
              {
                package: 'system',
                version: '1.6.4',
                integration: undefined,
              },
              {
                package: 'aws',
                integration: 'cloudtrail',
                version: '1.11.0',
              },
            ];
            return response.ok({ body: transformed ?? {} });
          }
        } else {
          const error = getIdError({ id, ruleId });
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
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
