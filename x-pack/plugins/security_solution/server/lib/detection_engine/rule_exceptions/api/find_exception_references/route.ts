/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';

import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import type {
  FindExceptionReferencesOnRuleSchemaDecoded,
  RuleReferencesSchema,
} from '../../../../../../common/api/detection_engine/rule_exceptions';
import {
  DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL,
  findExceptionReferencesOnRuleSchema,
  rulesReferencedByExceptionListsSchema,
} from '../../../../../../common/api/detection_engine/rule_exceptions';
import { findRules } from '../../../rule_management/logic/search/find_rules';

export const findRuleExceptionReferencesRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      path: DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL,
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
            query: buildRouteValidation<
              typeof findExceptionReferencesOnRuleSchema,
              FindExceptionReferencesOnRuleSchemaDecoded
            >(findExceptionReferencesOnRuleSchema),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { ids, namespace_types: namespaceTypes, list_ids: listIds } = request.query;

          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = ctx.alerting.getRulesClient();
          const listsClient = ctx.securitySolution.getExceptionListClient();

          if (
            ids != null &&
            listIds != null &&
            (ids.length !== namespaceTypes.length || ids.length !== listIds.length)
          ) {
            return siemResponse.error({
              body: `"ids", "list_ids" and "namespace_types" need to have the same comma separated number of values. Expected "ids" length: ${ids.length} to equal "namespace_types" length: ${namespaceTypes.length} and "list_ids" length: ${listIds.length}.`,
              statusCode: 400,
            });
          }

          const fetchExact = ids != null && listIds != null;
          const foundExceptionLists = await listsClient?.findExceptionList({
            filter: fetchExact
              ? `(${listIds
                  .map(
                    (listId, index) =>
                      `${getSavedObjectType({
                        namespaceType: namespaceTypes[index],
                      })}.attributes.list_id:${listId}`
                  )
                  .join(' OR ')})`
              : undefined,
            namespaceType: namespaceTypes,
            page: 1,
            perPage: 10000,
            sortField: undefined,
            sortOrder: undefined,
          });

          if (foundExceptionLists == null) {
            return response.ok({ body: { references: [] } });
          }
          const references: RuleReferencesSchema[] = await Promise.all(
            foundExceptionLists.data.map(async (list, index) => {
              const foundRules = await findRules({
                rulesClient,
                perPage: 10000,
                hasReference: {
                  id: list.id,
                  type: getSavedObjectType({ namespaceType: list.namespace_type }),
                },
                filter: undefined,
                fields: undefined,
                sortField: undefined,
                sortOrder: undefined,
                page: undefined,
              });

              const ruleData = foundRules.data.map(({ name, id, params }) => ({
                name,
                id,
                rule_id: params.ruleId,
                exception_lists: params.exceptionsList,
              }));

              return {
                [list.list_id]: {
                  ...list,
                  referenced_rules: ruleData,
                },
              };
            })
          );

          const [validated, errors] = validate(
            { references },
            rulesReferencedByExceptionListsSchema
          );

          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? { references: [] } });
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
