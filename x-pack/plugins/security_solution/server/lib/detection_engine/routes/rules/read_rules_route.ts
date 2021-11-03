/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { Logger } from 'src/core/server';
import { queryRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/query_rules_type_dependents';
import {
  queryRulesSchema,
  QueryRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/query_rules_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getIdError, transform } from './utils';
import { buildSiemResponse } from '../utils';

import { readRules } from '../../rules/read_rules';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActionsSavedObject } from '../../rule_actions/legacy_get_rule_actions_saved_object';

export const readRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  isRuleRegistryEnabled: boolean
) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        query: buildRouteValidation<typeof queryRulesSchema, QueryRulesSchemaDecoded>(
          queryRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = queryRuleValidateTypeDependents(request.query);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      const { id, rule_id: ruleId } = request.query;

      const rulesClient = context.alerting?.getRulesClient();

      try {
        if (!rulesClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const ruleStatusClient = context.securitySolution.getExecutionLogClient();
        const savedObjectsClient = context.core.savedObjects.client;
        const rule = await readRules({
          id,
          isRuleRegistryEnabled,
          rulesClient,
          ruleId,
        });
        if (rule != null) {
          const legacyRuleActions = await legacyGetRuleActionsSavedObject({
            savedObjectsClient,
            ruleAlertId: rule.id,
            logger,
          });
          const ruleStatuses = await ruleStatusClient.find({
            logsCount: 1,
            ruleId: rule.id,
            spaceId: context.securitySolution.getSpaceId(),
          });
          const [currentStatus] = ruleStatuses;
          if (currentStatus != null && rule.executionStatus.status === 'error') {
            currentStatus.attributes.lastFailureMessage = `Reason: ${rule.executionStatus.error?.reason} Message: ${rule.executionStatus.error?.message}`;
            currentStatus.attributes.lastFailureAt =
              rule.executionStatus.lastExecutionDate.toISOString();
            currentStatus.attributes.statusDate =
              rule.executionStatus.lastExecutionDate.toISOString();
            currentStatus.attributes.status = RuleExecutionStatus.failed;
          }
          const transformed = transform(
            rule,
            currentStatus,
            isRuleRegistryEnabled,
            legacyRuleActions
          );
          if (transformed == null) {
            return siemResponse.error({ statusCode: 500, body: 'Internal error transforming' });
          } else {
            return response.ok({ body: transformed ?? {} });
          }
        } else {
          const error = getIdError({ id, ruleId });
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
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
