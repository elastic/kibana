/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { Logger } from 'src/core/server';
import { findRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/find_rules_type_dependents';
import {
  findRulesSchema,
  FindRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/find_rules_schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { findRules } from '../../rules/find_rules';
import { buildSiemResponse } from '../utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { transformFindAlerts } from './utils';

// eslint-disable-next-line no-restricted-imports
import { legacyGetBulkRuleActionsSavedObject } from '../../rule_actions/legacy_get_bulk_rule_actions_saved_object';

export const findRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  isRuleRegistryEnabled: boolean
) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_find`,
      validate: {
        query: buildRouteValidation<typeof findRulesSchema, FindRulesSchemaDecoded>(
          findRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = findRuleValidateTypeDependents(request.query);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      try {
        const { query } = request;
        const rulesClient = context.alerting?.getRulesClient();
        const savedObjectsClient = context.core.savedObjects.client;

        if (!rulesClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const execLogClient = context.securitySolution.getExecutionLogClient();
        const rules = await findRules({
          isRuleRegistryEnabled,
          rulesClient,
          perPage: query.per_page,
          page: query.page,
          sortField: query.sort_field,
          sortOrder: query.sort_order,
          filter: query.filter,
          fields: query.fields,
        });
        const alertIds = rules.data.map((rule) => rule.id);

        const [ruleStatuses, ruleActions] = await Promise.all([
          execLogClient.findBulk({
            ruleIds: alertIds,
            logsCount: 1,
            spaceId: context.securitySolution.getSpaceId(),
          }),
          legacyGetBulkRuleActionsSavedObject({ alertIds, savedObjectsClient, logger }),
        ]);
        const transformed = transformFindAlerts(rules, ruleStatuses, ruleActions);
        if (transformed == null) {
          return siemResponse.error({ statusCode: 500, body: 'Internal error transforming' });
        } else {
          return response.ok({ body: transformed ?? {} });
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
