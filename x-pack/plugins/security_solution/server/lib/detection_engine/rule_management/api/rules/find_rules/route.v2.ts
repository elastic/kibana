/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { convertRulesFilterToKQL } from '../../../../../../../common/detection_engine/rule_management/rule_filtering';
import { DETECTION_ENGINE_RULES_URL_FIND } from '../../../../../../../common/constants';
import type { FindRulesV2Response } from '../../../../../../../common/api/detection_engine/rule_management';
import { FindRulesV2RequestQuery } from '../../../../../../../common/api/detection_engine/rule_management';

import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';
import { buildSiemResponse } from '../../../../routes/utils';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import { internalRuleToAPIResponse } from '../../../normalization/rule_converters';

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
        version: '2024-05-15',
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindRulesV2RequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<FindRulesV2Response>> => {
        const siemResponse = buildSiemResponse(response);

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
            filter: convertRulesFilterToKQL({
              tags: query.filter?.tags,
              enabled: query.filter?.enabled,
              showCustomRules: query.filter?.source === 'custom',
              showElasticRules: query.filter?.source === 'prebuilt',
            }),
            fields: query.fields,
          });

          return response.ok({
            body: {
              pagination: {
                page: rules.page,
                per_page: rules.perPage,
                total: rules.total,
              },
              rules: rules.data.map((rule) => {
                return internalRuleToAPIResponse(rule);
              }),
            },
          });
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
