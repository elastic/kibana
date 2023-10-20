/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedRouteConfig } from '@kbn/core-http-server';
import type { IKibanaResponse, Logger, RequestHandler } from '@kbn/core/server';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import {
  BulkCrudRulesResponse,
  BulkDeleteRulesRequestBody,
  validateQueryRuleByIds,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_BULK_DELETE } from '../../../../../../../common/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../../../types';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import {
  buildSiemResponse,
  createBulkErrorObject,
  transformBulkError,
} from '../../../../routes/utils';
import { deleteRules } from '../../../logic/crud/delete_rules';
import { readRules } from '../../../logic/crud/read_rules';
import { getIdBulkError } from '../../../utils/utils';
import { transformValidateBulkError } from '../../../utils/validate';
import { getDeprecatedBulkEndpointHeader, logDeprecatedBulkEndpoint } from '../../deprecation';

type Handler = RequestHandler<
  unknown,
  unknown,
  BulkDeleteRulesRequestBody,
  SecuritySolutionRequestHandlerContext,
  'delete' | 'post'
>;

/**
 * @deprecated since version 8.2.0. Use the detection_engine/rules/_bulk_action API instead
 */
export const bulkDeleteRulesRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  const handler: Handler = async (
    context,
    request,
    response
  ): Promise<IKibanaResponse<BulkCrudRulesResponse>> => {
    logDeprecatedBulkEndpoint(logger, DETECTION_ENGINE_RULES_BULK_DELETE);

    const siemResponse = buildSiemResponse(response);

    const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);

    const rulesClient = ctx.alerting.getRulesClient();

    const rules = await Promise.all(
      request.body.map(async (payloadRule) => {
        const { id, rule_id: ruleId } = payloadRule;
        const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
        const validationErrors = validateQueryRuleByIds(payloadRule);
        if (validationErrors.length) {
          return createBulkErrorObject({
            ruleId: idOrRuleIdOrUnknown,
            statusCode: 400,
            message: validationErrors.join(),
          });
        }

        try {
          const rule = await readRules({ rulesClient, id, ruleId });
          if (!rule) {
            return getIdBulkError({ id, ruleId });
          }

          await deleteRules({
            ruleId: rule.id,
            rulesClient,
          });

          return transformValidateBulkError(idOrRuleIdOrUnknown, rule);
        } catch (err) {
          return transformBulkError(idOrRuleIdOrUnknown, err);
        }
      })
    );
    const [validated, errors] = validate(rules, BulkCrudRulesResponse);
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

  const routeConfig: VersionedRouteConfig<'post' | 'delete'> = {
    access: 'public',
    path: DETECTION_ENGINE_RULES_BULK_DELETE,
    options: {
      tags: ['access:securitySolution'],
    },
  };
  const versionConfig = {
    version: '2023-10-31',
    validate: {
      request: {
        body: buildRouteValidation(BulkDeleteRulesRequestBody),
      },
    },
  };
  router.versioned.delete(routeConfig).addVersion(versionConfig, handler);
  router.versioned.post(routeConfig).addVersion(versionConfig, handler);
};
