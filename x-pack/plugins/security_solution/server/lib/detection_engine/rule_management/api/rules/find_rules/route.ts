/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { DETECTION_ENGINE_RULES_URL_FIND } from '../../../../../../../common/constants';
import type { FindRulesResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  FindRulesRequestQuery,
  validateFindRulesRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';

import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';
import { buildSiemResponse } from '../../../../routes/utils';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import { transformFindAlerts } from '../../../utils/utils';

export const findRulesRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: DETECTION_ENGINE_RULES_URL_FIND,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindRulesRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<FindRulesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        const validationErrors = validateFindRulesRequestQuery(request.query);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        try {
          const { query } = request;
          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = ctx.alerting.getRulesClient();

          const rules = await findRules({
            rulesClient,
            perPage: query.per_page,
            page: query.page,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            filter: query.filter,
            fields: query.fields,
          });

          const transformed = transformFindAlerts(rules);
          return response.ok({ body: transformed ?? {} });
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
