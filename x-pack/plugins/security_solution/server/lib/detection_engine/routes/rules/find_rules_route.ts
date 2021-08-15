/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import { IRuleDataClient } from '../../../../../../rule_registry/server';
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
import { getBulkRuleActionsSavedObject } from '../../rule_actions/get_bulk_rule_actions_saved_object';
import { RACRuleParams, RuleParams } from '../../schemas/rule_schemas';
import { RulesClient } from '../../../../../../alerting/server';
import { RuleExecutionLogClient } from '../../rule_execution_log/rule_execution_log_client';
import { SavedObjectsClientContract } from '../../../../../../../../src/core/server';

export const findRulesRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient?: IRuleDataClient | null
) => {
  const isRuleRegistryEnabled = ruleDataClient != null;
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

      const findAndTransform = async <TRuleParams extends RuleParams>(opts: {
        execLogClient: RuleExecutionLogClient;
        query: FindRulesSchemaDecoded;
        rulesClient: RulesClient;
        savedObjectsClient: SavedObjectsClientContract;
      }) => {
        const { execLogClient, query, rulesClient, savedObjectsClient } = opts;
        const rules = await findRules<TRuleParams>({
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
          getBulkRuleActionsSavedObject({ alertIds, savedObjectsClient }),
        ]);

        const transformed = transformFindAlerts<TRuleParams>(
          rules,
          ruleActions,
          ruleStatuses,
          isRuleRegistryEnabled
        );

        if (transformed == null) {
          return siemResponse.error({ statusCode: 500, body: 'Internal error transforming' });
        } else {
          return response.ok({ body: transformed ?? {} });
        }
      };

      try {
        const { query } = request;
        const rulesClient = context.alerting?.getRulesClient();
        const savedObjectsClient = context.core.savedObjects.client;

        if (!rulesClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const execLogClient = context.securitySolution.getExecutionLogClient();

        if (isRuleRegistryEnabled) {
          return await findAndTransform<RACRuleParams>({
            execLogClient,
            query,
            rulesClient,
            savedObjectsClient,
          });
        } else {
          return await findAndTransform<RuleParams>({
            execLogClient,
            query,
            rulesClient,
            savedObjectsClient,
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
