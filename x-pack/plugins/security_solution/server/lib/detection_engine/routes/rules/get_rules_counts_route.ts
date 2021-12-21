/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash/fp';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getRulesCountSchema } from '../../../../../common/detection_engine/schemas/request/get_rules_count_shema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { findRules } from '../../rules/find_rules';
import { buildSiemResponse } from '../utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { isElasticRule } from '../../../../usage/detections';

export const getRulesCountRoute = (
  router: SecuritySolutionPluginRouter,
  isRuleRegistryEnabled: boolean
) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_get_rules_count`,
      validate: {
        query: buildRouteValidation<typeof getRulesCountSchema>(getRulesCountSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const { query } = request;
        const rulesClient = context.alerting?.getRulesClient();

        if (!rulesClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const rules = await findRules({
          isRuleRegistryEnabled,
          rulesClient,
          perPage: 10_000,
          page: 1,
          sortField: 'enabled',
          sortOrder: 'desc',
          filter: query.filter || undefined,
          fields: ['tags'],
        });

        const [elasticRules, customRules] = partition(
          (rule) => isElasticRule(rule.tags),
          rules.data
        );
        return response.ok({
          body: {
            elastic_rules_count: elasticRules.length,
            custom_rules_count: customRules.length,
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
