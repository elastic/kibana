/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';

import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { enrichFilterWithRuleTypeMapping } from '../../rules/enrich_filter_with_rule_type_mappings';
import type { FindExceptionReferencesOnRuleSchema } from '../../../../../common/detection_engine/schemas/request/find_exception_references_schema';
import { findExceptionReferencesOnRuleSchema } from '../../../../../common/detection_engine/schemas/request/find_exception_references_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

export const findRuleExceptionReferencesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/exceptions/_find_references`,
      validate: {
        query: buildRouteValidation<
          typeof findExceptionReferencesOnRuleSchema,
          FindExceptionReferencesOnRuleSchema
        >(findExceptionReferencesOnRuleSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const { list_ids, namespace_types, list_list_ids } = request.query;
        const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
        const rulesClient = ctx.alerting.getRulesClient();

        const results = await Promise.all(
          list_ids.map(async (id, index) => {
            return rulesClient.find({
              options: {
                perPage: 1000,
                filter: enrichFilterWithRuleTypeMapping(null),
                hasReference: {
                  id,
                  type: getSavedObjectType({ namespaceType: namespace_types[index] }),
                },
              },
            });
          })
        );

        const a = results.reduce((acc, data, index) => {
          const wantedData = data.data.map(({ name, id, params }) => ({
            name,
            id,
            ruleId: params.ruleId,
            exceptionLists: params.exceptionsList,
          }));
          acc[list_list_ids[index]] = wantedData;

          return acc;
        }, {});
        console.log({ RESULT: JSON.stringify(a) });
        return response.ok({ body: a ?? {} });
        // const ruleIds = rules.data.map((rule) => rule.id);

        // const [ruleExecutionSummaries, ruleActions] = await Promise.all([
        //   ruleExecutionLog.getExecutionSummariesBulk(ruleIds),
        //   legacyGetBulkRuleActionsSavedObject({ alertIds: ruleIds, savedObjectsClient, logger }),
        // ]);

        // const transformed = transformFindAlerts(rules, ruleExecutionSummaries, ruleActions);
        // if (transformed == null) {
        //   return siemResponse.error({ statusCode: 500, body: 'Internal error transforming' });
        // } else {
        //   return response.ok({ body: transformed ?? {} });
        // }
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
