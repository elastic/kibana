/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  CreateRuleDefaultExceptionListSchemaDecoded,
  createRuleDefaultExceptionListSchema,
} from '../../../../../common/detection_engine/schemas/request';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

import { getIdError } from './utils';
import { patchRules } from '../../rules/patch_rules';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { readRules } from '../../rules/read_rules';

export const createRuleDefaultExceptionListRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/exceptions`,
      validate: {
        body: buildRouteValidation<
          typeof createRuleDefaultExceptionListSchema,
          CreateRuleDefaultExceptionListSchemaDecoded
        >(createRuleDefaultExceptionListSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const ctx = await context.resolve(['core', 'securitySolution', 'alerting', 'licensing']);

        const rulesClient = ctx.alerting.getRulesClient();
        const listsClient = ctx.securitySolution.getExceptionListClient();
        const siemClient = ctx.securitySolution.getAppClient();

        const existingRule = await readRules({
          rulesClient,
          ruleId: request.body.rule_so_id,
          id: request.body.rule_id,
        });
        console.log({ RULE: JSON.stringify(existingRule) });
        if (existingRule == null) {
          return siemResponse.error({ statusCode: 500, body: 'Rule not found' });
        }

        // Check to see if the rule that is being updated to include a new default exception list
        // does not already have a default exception list attached. If it does, do not move forward
        // with exception list creation.
        const ruleHasDefaultList =
          existingRule.params.exceptionsList.filter(
            (list) => list.type === ExceptionListTypeEnum.DETECTION_RULE
          ).length > 0;

        if (ruleHasDefaultList) {
          return siemResponse.error({
            statusCode: 405,
            body: 'Rule already contains a default exception list.',
          });
        }
        console.log({ LIST: JSON.stringify(request.body) });

        // At this point we're assuming that the rule does NOT have a default exception list attached. So
        // we are good to go ahead and create the exception list.
        const {
          list: { description, list_id: listId, meta, name, tags, version },
        } = request.body;

        const exceptionList = await listsClient?.createExceptionList({
          description,
          immutable: true,
          listId,
          meta,
          name,
          namespaceType: 'single',
          tags,
          type: ExceptionListTypeEnum.DETECTION_RULE,
          version,
        });

        if (exceptionList == null) {
          return siemResponse.error({
            statusCode: 500,
            body: 'Error creating default rule exception list.',
          });
        }
        console.log({ exceptionList });
        // The list client has no rules client context, so once we've created the exception list,
        // we need to go ahead and "attach" it to the rule.
        const existingRuleExceptionLists = existingRule.params.exceptionsList ?? [];
        const rule = await patchRules({
          rulesClient,
          rule: existingRule,
          exceptionsList: [
            ...existingRuleExceptionLists,
            {
              id: exceptionList.id,
              list_id: exceptionList.list_id,
              type: exceptionList.type,
              namespace_type: exceptionList.namespace_type,
            },
          ],
        });

        if (rule != null) {
          // const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();
          // const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(rule.id);
          // const [validated, errors] = transformValidate(rule, ruleExecutionSummary);
          // if (errors != null) {
          //   return siemResponse.error({ statusCode: 500, body: errors });
          // } else {
          return response.ok({ body: exceptionList });
          // }
        } else {
          const error = getIdError({ id: request.body.id, ruleId: request.body.rule_id });
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      } catch (err) {
        console.log({ ERR: JSON.stringify(err) });
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
