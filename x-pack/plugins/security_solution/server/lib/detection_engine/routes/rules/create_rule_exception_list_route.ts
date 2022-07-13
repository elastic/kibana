/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  CreateExceptionListSchema,
  ExceptionListSchema,
  ExceptionListType,
} from '@kbn/securitysolution-io-ts-list-types';
import { exceptionListSchema, ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { validate } from '@kbn/securitysolution-io-ts-utils';

import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import type { CreateRuleDefaultExceptionListSchemaDecoded } from '../../../../../common/detection_engine/schemas/request';
import { createRuleDefaultExceptionListSchema } from '../../../../../common/detection_engine/schemas/request';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

import { getIdError } from './utils';
import { patchRules } from '../../rules/patch_rules';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { readRules } from '../../rules/read_rules';

const ALLOWED_LIST_TYPES: ExceptionListType[] = [
  ExceptionListTypeEnum.ENDPOINT,
  ExceptionListTypeEnum.DETECTION,
  ExceptionListTypeEnum.RULE_DEFAULT,
];

export const createRuleExceptionListRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_URL}/exceptions`,
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
        const ctx = await context.resolve([
          'core',
          'securitySolution',
          'alerting',
          'licensing',
          'lists',
        ]);
        const rulesClient = ctx.alerting.getRulesClient();
        const listsClient = ctx.securitySolution.getExceptionListClient();

        const { list: listToCreate, list_type: listType, rule_so_id: ruleId } = request.body;

        // Param validations
        const validationErrors = createRuleValidateTypeDependents(listType, listToCreate);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

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

        let exceptionListAssociatedToRule: ExceptionListSchema | undefined;

        if (listType === ExceptionListTypeEnum.ENDPOINT) {
          const ruleHasEndpointList =
            rule.params.exceptionsList.filter(
              (list) => list.type === ExceptionListTypeEnum.ENDPOINT
            ).length > 0;

          if (ruleHasEndpointList) {
            return siemResponse.error({
              statusCode: 409,
              body: 'rule is already linked to the "endpoint" exception list',
            });
          }

          // Check if endpoint list already exists, if it doesn't, create it
          const foundExceptionList = await listsClient?.getExceptionList({
            id: ENDPOINT_LIST_ID,
            listId: ENDPOINT_LIST_ID,
            namespaceType: 'agnostic',
          });

          if (foundExceptionList != null) {
            return siemResponse.error({
              body: `"endpoint" exception list already exists`,
              statusCode: 409,
            });
          }

          exceptionListAssociatedToRule = await listsClient?.createEndpointList();
        } else {
          const {
            name,
            tags,
            meta,
            namespace_type: namespaceType,
            description,
            list_id: listId,
            type,
            version,
          } = listToCreate;

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
            const ruleHasDefaultList =
              rule.params.exceptionsList.filter(
                (list) => list.type === ExceptionListTypeEnum.RULE_DEFAULT
              ).length > 0;

            if (ruleHasDefaultList) {
              return siemResponse.error({
                statusCode: 409,
                body: 'Rule already contains a default exception list.',
              });
            }
          }

          exceptionListAssociatedToRule = await listsClient?.createExceptionList({
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
        }

        if (exceptionListAssociatedToRule == null) {
          return siemResponse.error({ statusCode: 500, body: 'Error creating exception list.' });
        }

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

        if (patchedRule != null) {
          const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();
          await ruleExecutionLog.getExecutionSummary(patchedRule.id);
          const [validated, errors] = validate(exceptionListAssociatedToRule, exceptionListSchema);
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
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

export const validateListType = (type: ExceptionListType): string[] => {
  const errors: string[] = [];
  if (!ALLOWED_LIST_TYPES.includes(type)) {
    errors.push(`exception list "type" of "${type}", cannot be added to a rule`);
  }

  return errors;
};

export const validateList = (
  type: ExceptionListType,
  list?: CreateExceptionListSchema
): string[] => {
  const errors: string[] = [];
  if (type === ExceptionListTypeEnum.ENDPOINT && list != null) {
    errors.push(
      `exception list "type" of "endpoint" is created by the system, cannot specify list properties`
    );
  } else if (type !== ExceptionListTypeEnum.ENDPOINT && list == null) {
    errors.push(`exception list "type" of "${type}" is missing "list" property`);
  } else if (list != null && type !== list.type) {
    errors.push(`"list_type" must match "type" property on "list"`);
  }

  return errors;
};

export const createRuleValidateTypeDependents = (
  type: ExceptionListType,
  list?: CreateExceptionListSchema
): string[] => {
  return [...validateListType(type), ...validateList(type, list)];
};
