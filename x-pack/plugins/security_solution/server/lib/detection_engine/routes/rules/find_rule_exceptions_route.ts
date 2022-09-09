/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import type { FindResult } from '@kbn/alerting-plugin/server';

import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { enrichFilterWithRuleTypeMapping } from '../../rules/enrich_filter_with_rule_type_mappings';
import type { FindExceptionReferencesOnRuleSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/find_exception_list_references_schema';
import { findExceptionReferencesOnRuleSchema } from '../../../../../common/detection_engine/schemas/request/find_exception_list_references_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import type { RuleReferencesSchema } from '../../../../../common/detection_engine/schemas/response/find_exception_list_references_schema';
import { rulesReferencedByExceptionListsSchema } from '../../../../../common/detection_engine/schemas/response/find_exception_list_references_schema';
import type { RuleParams } from '../../schemas/rule_schemas';

export const findRuleExceptionReferencesRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL,
      validate: {
        query: buildRouteValidation<
          typeof findExceptionReferencesOnRuleSchema,
          FindExceptionReferencesOnRuleSchemaDecoded
        >(findExceptionReferencesOnRuleSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const { ids, namespace_types: namespaceTypes, list_ids: listIds } = request.query;

        const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
        const rulesClient = ctx.alerting.getRulesClient();

        if (ids.length !== namespaceTypes.length || ids.length !== listIds.length) {
          return siemResponse.error({
            body: `"ids", "list_ids" and "namespace_types" need to have the same comma separated number of values. Expected "ids" length: ${ids.length} to equal "namespace_types" length: ${namespaceTypes.length} and "list_ids" length: ${listIds.length}.`,
            statusCode: 400,
          });
        }

        const foundRules: Array<FindResult<RuleParams>> = await Promise.all(
          ids.map(async (id, index) => {
            return rulesClient.find({
              options: {
                perPage: 10000,
                filter: enrichFilterWithRuleTypeMapping(null),
                hasReference: {
                  id,
                  type: getSavedObjectType({ namespaceType: namespaceTypes[index] }),
                },
              },
            });
          })
        );

        const references = foundRules.map<RuleReferencesSchema>(({ data }, index) => {
          const wantedData = data.map(({ name, id, params }) => ({
            name,
            id,
            rule_id: params.ruleId,
            exception_lists: params.exceptionsList,
          }));
          return { [listIds[index]]: wantedData };
        });

        const [validated, errors] = validate({ references }, rulesReferencedByExceptionListsSchema);

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
