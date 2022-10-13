/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';

import type { RouteConfig, RequestHandler, Logger } from '@kbn/core/server';
import { queryRuleValidateTypeDependents } from '../../../../../../../common/detection_engine/schemas/request/query_rules_type_dependents';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import type { QueryRulesBulkSchemaDecoded } from '../../../../../../../common/detection_engine/schemas/request/query_rules_bulk_schema';
import { queryRulesBulkSchema } from '../../../../../../../common/detection_engine/schemas/request/query_rules_bulk_schema';
import { rulesBulkSchema } from '../../../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../../../types';
import { DETECTION_ENGINE_RULES_BULK_DELETE } from '../../../../../../../common/constants';
import { getIdBulkError } from '../../../utils/utils';
import { transformValidateBulkError } from '../../../utils/validate';
import {
  transformBulkError,
  buildSiemResponse,
  createBulkErrorObject,
} from '../../../../routes/utils';
import { deleteRules } from '../../../logic/crud/delete_rules';
import { readRules } from '../../../logic/crud/read_rules';
// eslint-disable-next-line no-restricted-imports
import { legacyMigrate } from '../../../logic/rule_actions/legacy_action_migration';
import { getDeprecatedBulkEndpointHeader, logDeprecatedBulkEndpoint } from '../../deprecation';

type Config = RouteConfig<unknown, unknown, QueryRulesBulkSchemaDecoded, 'delete' | 'post'>;
type Handler = RequestHandler<
  unknown,
  unknown,
  QueryRulesBulkSchemaDecoded,
  SecuritySolutionRequestHandlerContext,
  'delete' | 'post'
>;

/**
 * @deprecated since version 8.2.0. Use the detection_engine/rules/_bulk_action API instead
 */
export const deleteRulesBulkRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  const config: Config = {
    validate: {
      body: buildRouteValidation<typeof queryRulesBulkSchema, QueryRulesBulkSchemaDecoded>(
        queryRulesBulkSchema
      ),
    },
    path: DETECTION_ENGINE_RULES_BULK_DELETE,
    options: {
      tags: ['access:securitySolution'],
    },
  };
  const handler: Handler = async (context, request, response) => {
    logDeprecatedBulkEndpoint(logger, DETECTION_ENGINE_RULES_BULK_DELETE);

    const siemResponse = buildSiemResponse(response);

    const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);

    const rulesClient = ctx.alerting.getRulesClient();
    const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();
    const savedObjectsClient = ctx.core.savedObjects.client;

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
      return siemResponse.error({
        statusCode: 500,
        body: errors,
        headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_DELETE),
      });
    } else {
      return response.ok({
        body: validated ?? {},
        headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_DELETE),
      });
    }
  };

  router.delete(config, handler);
  router.post(config, handler);
};
