/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';

import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  CreateExceptionListSchema,
  CreateExceptionListSchemaDecoded,
  CreateRuleExceptionListItemSchemaDecoded,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  createExceptionListSchema,
  exceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import { formatErrors, validate } from '@kbn/securitysolution-io-ts-utils';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  CreateRuleExceptionSchemaDecoded,
  QueryRuleByIdSchemaDecoded,
} from '../../../../../../common/detection_engine/schemas/request';
import {
  createRuleExceptionsSchema,
  queryRuleByIdSchema,
} from '../../../../../../common/detection_engine/schemas/request';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../common/constants';
import { buildSiemResponse } from '../../../routes/utils';
import { patchRules } from '../../../rule_management/logic/crud/patch_rules';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { readRules } from '../../../rule_management/logic/crud/read_rules';
import type { RuleParams } from '../../../rule_schema';
import { checkDefaultRuleExceptionListReferences } from '../../../rule_management/logic/exceptions/check_for_default_rule_exception_list';

export const createRuleExceptionsRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/{id}/exceptions`,
      validate: {
        params: buildRouteValidation<typeof queryRuleByIdSchema, QueryRuleByIdSchemaDecoded>(
          queryRuleByIdSchema
        ),
        body: buildRouteValidation<
          typeof createRuleExceptionsSchema,
          CreateRuleExceptionSchemaDecoded
        >(createRuleExceptionsSchema),
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
        const { id: ruleId } = request.params;

        // Check that the rule they're trying to add an exception list to exists
        const rule = await readRules({
          rulesClient,
          ruleId: undefined,
          id: ruleId,
        });

        if (rule == null) {
          return siemResponse.error({
            statusCode: 500,
            body: `Unable to add exception to rule - rule with id:"${ruleId}" not found`,
          });
        }

        let createdItems;

        const ruleDefaultLists = rule.params.exceptionsList.filter(
          (list) => list.type === ExceptionListTypeEnum.RULE_DEFAULT
        );

        // This should hopefully never happen, but could if we forget to add such a check to one
        // of our routes allowing the user to update the rule to have more than one default list added
        checkDefaultRuleExceptionListReferences({ exceptionLists: rule.params.exceptionsList });

        const [ruleDefaultList] = ruleDefaultLists;

        if (ruleDefaultList != null) {
          // check that list does indeed exist
          const exceptionListAssociatedToRule = await listsClient?.getExceptionList({
            id: ruleDefaultList.id,
            listId: ruleDefaultList.list_id,
            namespaceType: ruleDefaultList.namespace_type,
          });

          // if list does exist, just need to create the items
          if (exceptionListAssociatedToRule != null) {
            createdItems = await createExceptionListItems({
              items,
              defaultList: exceptionListAssociatedToRule,
              listsClient,
            });
          } else {
            // This means that there was missed cleanup when this rule exception list was
            // deleted and it remained referenced on the rule. Let's remove it from the rule,
            // and update the rule's exceptions lists to include newly created default list.
            const defaultList = await createAndAssociateDefaultExceptionList({
              rule,
              rulesClient,
              listsClient,
              removeOldAssociation: true,
            });

            createdItems = await createExceptionListItems({ items, defaultList, listsClient });
          }
        } else {
          const defaultList = await createAndAssociateDefaultExceptionList({
            rule,
            rulesClient,
            listsClient,
            removeOldAssociation: false,
          });

          createdItems = await createExceptionListItems({ items, defaultList, listsClient });
        }

        const [validated, errors] = validate(createdItems, t.array(exceptionListItemSchema));
        if (errors != null) {
          return siemResponse.error({ body: errors, statusCode: 500 });
        } else {
          return response.ok({ body: validated ?? {} });
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

export const createExceptionListItems = async ({
  items,
  defaultList,
  listsClient,
}: {
  items: CreateRuleExceptionListItemSchemaDecoded[];
  defaultList: ExceptionListSchema;
  listsClient: ExceptionListClient | null;
}) => {
  return Promise.all(
    items.map((item) =>
      listsClient?.createExceptionListItem({
        comments: item.comments,
        description: item.description,
        entries: item.entries,
        itemId: item.item_id,
        listId: defaultList.list_id,
        meta: item.meta,
        name: item.name,
        namespaceType: defaultList.namespace_type,
        osTypes: item.os_types,
        tags: item.tags,
        type: item.type,
      })
    )
  );
};

export const createAndAssociateDefaultExceptionList = async ({
  rule,
  listsClient,
  rulesClient,
  removeOldAssociation,
}: {
  rule: SanitizedRule<RuleParams>;
  listsClient: ExceptionListClient | null;
  rulesClient: RulesClient;
  removeOldAssociation: boolean;
}): Promise<ExceptionListSchema> => {
  const exceptionList: CreateExceptionListSchema = {
    description: `Exception list containing exceptions for rule with id: ${rule.id}`,
    meta: undefined,
    name: `Exceptions for rule - ${rule.name}`,
    namespace_type: 'single',
    tags: ['default_rule_exception_list'],
    type: ExceptionListTypeEnum.RULE_DEFAULT,
    version: 1,
  };

  // The `as` defeated me. Please send help
  // if you know what's missing here.
  const validated = pipe(
    createExceptionListSchema.decode(exceptionList),
    fold((errors) => {
      throw new Error(formatErrors(errors).join());
    }, identity)
  ) as CreateExceptionListSchemaDecoded;

  const {
    description,
    list_id: listId,
    meta,
    name,
    namespace_type: namespaceType,
    tags,
    type,
    version,
  } = validated;

  // create the default rule list
  const exceptionListAssociatedToRule = await listsClient?.createExceptionList({
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

  if (exceptionListAssociatedToRule == null) {
    throw Error(`An error occurred creating rule default exception list`);
  }

  // The list client has no rules client context, so once we've created the exception list,
  // we need to go ahead and "attach" it to the rule.
  const existingRuleExceptionLists = rule.params.exceptionsList ?? [];

  const ruleExceptionLists = removeOldAssociation
    ? existingRuleExceptionLists.filter((list) => list.type !== ExceptionListTypeEnum.RULE_DEFAULT)
    : existingRuleExceptionLists;

  await patchRules({
    rulesClient,
    existingRule: rule,
    nextParams: {
      ...rule.params,
      exceptions_list: [
        ...ruleExceptionLists,
        {
          id: exceptionListAssociatedToRule.id,
          list_id: exceptionListAssociatedToRule.list_id,
          type: exceptionListAssociatedToRule.type,
          namespace_type: exceptionListAssociatedToRule.namespace_type,
        },
      ],
    },
  });

  return exceptionListAssociatedToRule;
};
