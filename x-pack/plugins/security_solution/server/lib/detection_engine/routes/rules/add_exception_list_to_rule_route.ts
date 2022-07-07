/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { exceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { CreateRuleDefaultExceptionListSchemaDecoded, createRuleDefaultExceptionListSchema } from '../../../../../common/detection_engine/schemas/request';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

import { getIdError } from './utils';
import { patchRules } from '../../rules/patch_rules';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { readRules } from '../../rules/read_rules';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { validate } from '@kbn/securitysolution-io-ts-utils';

const ALLOWED_LIST_TYPES = [
  ExceptionListTypeEnum.DETECTION,
  ExceptionListTypeEnum.RULE_DEFAULT,
];

export const createRuleExceptionListRoute = (router: SecuritySolutionPluginRouter) => {
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
        const ctx = await context.resolve(['core', 'securitySolution', 'alerting', 'licensing', 'lists']);
        const rulesClient = ctx.alerting.getRulesClient();
        const listsClient = ctx.securitySolution.getExceptionListClient();

        const {
          list: {
            name,
            tags,
            meta,
            namespace_type: namespaceType,
            description,
            list_id: listId,
            type,
            version,
          },
          rule_id,
          rule_so_id,
        } = request.body;

        if (!ALLOWED_LIST_TYPES.includes(type)) {
          return siemResponse.error({ statusCode: 500, body: `Unable to add an exception list of type - ${type}- to a rule.` });
        }

        // Check that the rule they're trying to add an exception list to exists
        const rule = await readRules({
          rulesClient,
          ruleId: rule_id,
          id: rule_so_id,
        });
        
        if (rule == null) {
          return siemResponse.error({ statusCode: 500, body: `Unable to add exception list to rule - rule ${rule_id} not found` });
        }

        // Check that they're not trying to create a list with a `list_id` that already exists
        const foundExceptionList = await listsClient?.getExceptionList({
          id: undefined,
          listId,
          namespaceType,
        });

        if (foundExceptionList != null) {
          return siemResponse.error({
            body: `exception list id: "${listId}" already exists`,
            statusCode: 409,
          });
        }

        // Check to see if the rule that is being updated to include a new default exception list
        // does not already have a default exception list attached. If it does, do not move forward
        // with exception list creation.
        if (type === ExceptionListTypeEnum.RULE_DEFAULT) {
          const ruleHasDefaultList = rule.params.exceptionsList.filter((list) => list.type === ExceptionListTypeEnum.RULE_DEFAULT).length > 0;

          if (ruleHasDefaultList) {
            return siemResponse.error({ statusCode: 405, body: 'Rule already contains a default exception list.' });
          }
        }

        const createdExceptionList = await listsClient?.createExceptionList({
          description,
          immutable: false,
          listId,
          meta,
          name,
          namespaceType,
          tags,
          type,
          version,
        });

        if (createdExceptionList == null) {
          return siemResponse.error({ statusCode: 500, body: 'Error creating exception list.' });
        }

        // The list client has no rules client context, so once we've created the exception list,
        // we need to go ahead and "attach" it to the rule.  
        const existingRuleExceptionLists = rule.params.exceptionsList ?? [];    
        const patchedRule = await patchRules({
          rulesClient,
          rule,
          exceptionsList: [
              ...existingRuleExceptionLists,
              {
                id: createdExceptionList.id,
                list_id: createdExceptionList.list_id,
                type: createdExceptionList.type,
                namespace_type: createdExceptionList.namespace_type 
              },
            ],
          });

        if (patchedRule != null) {
          const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();
          await ruleExecutionLog.getExecutionSummary(patchedRule.id);
          const [validated, errors] = validate(createdExceptionList, exceptionListSchema);
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else {
          const error = getIdError({ id: rule_so_id, ruleId: rule_id });
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
