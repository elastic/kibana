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

import type {
  CreateRuleExceptionsRequestBodyDecoded,
  CreateRuleExceptionsRequestParamsDecoded,
} from '../../../../../../common/api/detection_engine/rule_exceptions';
import {
  CREATE_RULE_EXCEPTIONS_URL,
  CreateRuleExceptionsRequestBody,
  CreateRuleExceptionsRequestParams,
} from '../../../../../../common/api/detection_engine/rule_exceptions';

import { readRules } from '../../../rule_management/logic/detection_rules_client/read_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../rule_management/logic/exceptions/check_for_default_rule_exception_list';
import type { RuleParams } from '../../../rule_schema';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import type { IDetectionRulesClient } from '../../../rule_management/logic/detection_rules_client/detection_rules_client_interface';

export const createRuleExceptionsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: CREATE_RULE_EXCEPTIONS_URL,
      access: 'public',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: buildRouteValidation<
              typeof CreateRuleExceptionsRequestParams,
              CreateRuleExceptionsRequestParamsDecoded
            >(CreateRuleExceptionsRequestParams),
            body: buildRouteValidation<
              typeof CreateRuleExceptionsRequestBody,
              CreateRuleExceptionsRequestBodyDecoded
            >(CreateRuleExceptionsRequestBody),
          },
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
          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();

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

          const createdItems = await createRuleExceptions({
            items,
            rule,
            listsClient,
            detectionRulesClient,
          });

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

export const createRuleExceptions = async ({
  items,
  rule,
  listsClient,
  detectionRulesClient,
}: {
  items: CreateRuleExceptionListItemSchemaDecoded[];
  listsClient: ExceptionListClient | null;
  detectionRulesClient: IDetectionRulesClient;
  rule: SanitizedRule<RuleParams>;
}) => {
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
      return createExceptionListItems({
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
        listsClient,
        detectionRulesClient,
        removeOldAssociation: true,
      });

      return createExceptionListItems({ items, defaultList, listsClient });
    }
  } else {
    const defaultList = await createAndAssociateDefaultExceptionList({
      rule,
      listsClient,
      detectionRulesClient,
      removeOldAssociation: false,
    });

    return createExceptionListItems({ items, defaultList, listsClient });
  }
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
        expireTime: item.expire_time,
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

export const createExceptionList = async ({
  rule,
  listsClient,
}: {
  rule: SanitizedRule<RuleParams>;
  listsClient: ExceptionListClient | null;
}): Promise<ExceptionListSchema | null> => {
  if (!listsClient) return null;

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
  return listsClient.createExceptionList({
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
};

export const createAndAssociateDefaultExceptionList = async ({
  rule,
  listsClient,
  detectionRulesClient,
  removeOldAssociation,
}: {
  rule: SanitizedRule<RuleParams>;
  listsClient: ExceptionListClient | null;
  detectionRulesClient: IDetectionRulesClient;
  removeOldAssociation: boolean;
}): Promise<ExceptionListSchema> => {
  const exceptionListToAssociate = await createExceptionList({ rule, listsClient });

  if (exceptionListToAssociate == null) {
    throw Error(`An error occurred creating rule default exception list`);
  }

  // The list client has no rules client context, so once we've created the exception list,
  // we need to go ahead and "attach" it to the rule.
  const existingRuleExceptionLists = rule.params.exceptionsList ?? [];

  const ruleExceptionLists = removeOldAssociation
    ? existingRuleExceptionLists.filter((list) => list.type !== ExceptionListTypeEnum.RULE_DEFAULT)
    : existingRuleExceptionLists;

  await detectionRulesClient.patchRule({
    rulePatch: {
      rule_id: rule.params.ruleId,
      ...rule.params,
      exceptions_list: [
        ...ruleExceptionLists,
        {
          id: exceptionListToAssociate.id,
          list_id: exceptionListToAssociate.list_id,
          type: exceptionListToAssociate.type,
          namespace_type: exceptionListToAssociate.namespace_type,
        },
      ],
    },
  });

  return exceptionListToAssociate;
};
