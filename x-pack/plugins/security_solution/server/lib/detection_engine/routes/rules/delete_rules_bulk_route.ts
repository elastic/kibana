/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';

import { queryRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/query_rules_type_dependents';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import {
  queryRulesBulkSchema,
  QueryRulesBulkSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/query_rules_bulk_schema';
import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import type { RouteConfig, RequestHandler } from '../../../../../../../../src/core/server';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getIdBulkError } from './utils';
import { transformValidateBulkError } from './validate';
import { transformBulkError, buildSiemResponse, createBulkErrorObject } from '../utils';
import { deleteRules } from '../../rules/delete_rules';
import { readRules } from '../../rules/read_rules';
import { legacyMigrate } from '../../rules/utils';

type Config = RouteConfig<unknown, unknown, QueryRulesBulkSchemaDecoded, 'delete' | 'post'>;
type Handler = RequestHandler<
  unknown,
  unknown,
  QueryRulesBulkSchemaDecoded,
  SecuritySolutionRequestHandlerContext,
  'delete' | 'post'
>;

export const deleteRulesBulkRoute = (router: SecuritySolutionPluginRouter) => {
  const config: Config = {
    validate: {
      body: buildRouteValidation<typeof queryRulesBulkSchema, QueryRulesBulkSchemaDecoded>(
        queryRulesBulkSchema
      ),
    },
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    options: {
      tags: ['access:securitySolution'],
    },
  };
  const handler: Handler = async (context, request, response) => {
    const siemResponse = buildSiemResponse(response);
    const rulesClient = context.alerting.getRulesClient();
    const ruleExecutionLog = context.securitySolution.getRuleExecutionLog();
    const savedObjectsClient = context.core.savedObjects.client;

    const rules = await Promise.all(
      request.body.map(async (payloadRule) => {
        const { id, rule_id: ruleId } = payloadRule;
        const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
        const validationErrors = queryRuleValidateTypeDependents(payloadRule);
        if (validationErrors.length) {
          return createBulkErrorObject({
            ruleId: idOrRuleIdOrUnknown,
            statusCode: 400,
            message: validationErrors.join(),
          });
        }

        try {
          const rule = await readRules({ rulesClient, id, ruleId });
          const migratedRule = await legacyMigrate({
            rulesClient,
            savedObjectsClient,
            rule,
          });
          if (!migratedRule) {
            return getIdBulkError({ id, ruleId });
          }

          const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(migratedRule.id);

          await deleteRules({
            ruleId: migratedRule.id,
            rulesClient,
            ruleExecutionLog,
          });

          return transformValidateBulkError(
            idOrRuleIdOrUnknown,
            migratedRule,
            ruleExecutionSummary
          );
        } catch (err) {
          return transformBulkError(idOrRuleIdOrUnknown, err);
        }
      })
    );
    const [validated, errors] = validate(rules, rulesBulkSchema);
    if (errors != null) {
      return siemResponse.error({ statusCode: 500, body: errors });
    } else {
      return response.ok({ body: validated ?? {} });
    }
  };

  router.delete(config, handler);
  router.post(config, handler);
};
