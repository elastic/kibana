/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { exceptionListSchema, ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { validate } from '@kbn/securitysolution-io-ts-utils';

import type { AddRuleExceptionSchemaDecoded } from '../../../../../common/detection_engine/schemas/request';
import { addRuleExceptionsSchema } from '../../../../../common/detection_engine/schemas/request';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

import { getIdError } from './utils';
import { patchRules } from '../../rules/patch_rules';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { readRules } from '../../rules/read_rules';

export const addRuleExceptionsRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/exceptions`,
      validate: {
        query: buildRouteValidation<typeof queryRulesSchema, QueryRulesSchemaDecoded>(
          queryRulesSchema
        ),
        body: buildRouteValidation<typeof addRuleExceptionsSchema, AddRuleExceptionSchemaDecoded>(
          addRuleExceptionsSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const ctx = await context.resolve([
          'core',
          'securitySolution',
          'alerting',
          'licensing',
          'lists',
        ]);
        const rulesClient = ctx.alerting.getRulesClient();
        const listsClient = ctx.securitySolution.getExceptionListClient();

        const { items } = request.body;
        const { id: ruleId } = request.query;

        // Check that the rule they're trying to add an exception list to exists
        const rule = await readRules({
          rulesClient,
          ruleId: undefined,
          id: ruleId,
        });

        if (rule == null) {
          return siemResponse.error({
            statusCode: 500,
            body: `Unable to add exception list to rule - rule with id:"${ruleId}" not found`,
          });
        }

        const ruleHasDefaultList =
          rule.params.exceptionsList.filter(
            (list) => list.type === ExceptionListTypeEnum.RULE_DEFAULT
          ).length > 0;

        if (ruleHasDefaultList) {
          // update items to include list_id
        } else {
          // create the default list
          const exceptionListAssociatedToRule = await listsClient?.createExceptionList({
            description: `Exception list containing exceptions for rule with rule_id: ${rule.rule_id}`,
            immutable: false,
            listId,
            meta: undefined,
            name: `Exceptions for rule - ${rule.name}`,
            namespaceType: 'single',
            tags: ['default_rule_exception_list'],
            type: ExceptionListTypeEnum.RULE_DEFAULT,
            version: 1,
          });

          // The list client has no rules client context, so once we've created the exception list,
          // we need to go ahead and "attach" it to the rule.
          const existingRuleExceptionLists = rule.params.exceptionsList ?? [];
          const patchedRule = await patchRules({
            rulesClient,
            rule,
            params: {
              ...rule,
              exceptionsList: [
                ...existingRuleExceptionLists,
                {
                  id: exceptionListAssociatedToRule.id,
                  list_id: exceptionListAssociatedToRule.list_id,
                  type: exceptionListAssociatedToRule.type,
                  namespace_type: exceptionListAssociatedToRule.namespace_type,
                },
              ],
            },
          });

          // update items to include list_id
        }

        if (patchedRule != null) {
          const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();
          await ruleExecutionLog.getExecutionSummary(patchedRule.id);
          const [validated, errors] = validate(exceptionListAssociatedToRule, exceptionListSchema);
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok();
          }
        } else {
          const error = getIdError({ id: ruleId, ruleId: undefined });
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
