/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError, getIndexExists } from '@kbn/securitysolution-es-utils';

import { KibanaResponseFactory } from 'kibana/server';

import { IRuleDataClient } from '../../../../../../rule_registry/server';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { readRules } from '../../rules/read_rules';
import { buildSiemResponse } from '../utils';

import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import {
  CreateRulesSchema,
  createRulesSchema,
  RACCreateRulesSchema,
  racCreateRulesSchema,
} from '../../../../../common/detection_engine/schemas/request';
import { newTransformValidate } from './validate';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { convertCreateAPIToInternalSchema } from '../../schemas/rule_converters';
import {
  InternalRuleCreateBase,
  isInternalRACRuleCreate,
  isInternalRuleCreate,
} from '../../schemas/rule_schemas';
import { KibanaRequest } from '../../../../../../../../src/core/server';

export const createRulesRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  ruleDataClient?: IRuleDataClient | null // TODO: Use this for RAC (otherwise delete it)
): void => {
  const isRuleRegistryEnabled = ruleDataClient != null;
  const handleRequestFactory = <TSchema extends CreateRulesSchema>() => async (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest<{}, {}, TSchema>,
    response: KibanaResponseFactory
  ) => {
    const siemResponse = buildSiemResponse(response);
    const validationErrors = createRuleValidateTypeDependents(request.body);
    if (validationErrors.length) {
      return siemResponse.error({ statusCode: 400, body: validationErrors });
    }
    try {
      const rulesClient = context.alerting?.getRulesClient();
      const esClient = context.core.elasticsearch.client;
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.securitySolution?.getAppClient();

      if (!siemClient || !rulesClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      if (request.body.rule_id != null) {
        const rule = await readRules({
          isRuleRegistryEnabled,
          rulesClient,
          ruleId: request.body.rule_id,
          id: undefined,
        });
        if (rule != null) {
          return siemResponse.error({
            statusCode: 409,
            body: `rule_id: "${request.body.rule_id}" already exists`,
          });
        }
      }

      const internalRule: InternalRuleCreateBase = convertCreateAPIToInternalSchema<TSchema>(
        request.body,
        siemClient,
        isRuleRegistryEnabled
      );

      if (
        !(isInternalRuleCreate(internalRule) || isInternalRACRuleCreate(internalRule)) ||
        (isInternalRuleCreate(internalRule) && isRuleRegistryEnabled) ||
        (isInternalRACRuleCreate(internalRule) && !isRuleRegistryEnabled)
      ) {
        return siemResponse.error({ statusCode: 400, body: 'error validating params' });
      }

      const mlAuthz = buildMlAuthz({
        license: context.licensing.license,
        ml,
        request,
        savedObjectsClient,
      });
      throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));

      if (!isRuleRegistryEnabled) {
        const indexExists = await getIndexExists(
          esClient.asCurrentUser,
          internalRule.params.outputIndex
        );
        if (!indexExists) {
          return siemResponse.error({
            statusCode: 400,
            body: `To create a rule, the index must exist first. Index ${internalRule.params.outputIndex} does not exist`,
          });
        }
      }

      // This will create the endpoint list if it does not exist yet
      await context.lists?.getExceptionListClient().createEndpointList();

      const createdRule = await rulesClient.create({
        data: internalRule,
      });

      const ruleActions = await updateRulesNotifications({
        ruleAlertId: createdRule.id,
        rulesClient,
        savedObjectsClient,
        enabled: createdRule.enabled,
        actions: request.body.actions,
        throttle: request.body.throttle ?? null,
        name: createdRule.name,
      });

      const ruleStatuses = await context.securitySolution.getExecutionLogClient().find({
        logsCount: 1,
        ruleId: createdRule.id,
        spaceId: context.securitySolution.getSpaceId(),
      });
      const [validated, errors] = newTransformValidate(
        createdRule,
        ruleActions,
        ruleStatuses[0],
        isRuleRegistryEnabled
      );
      if (errors != null) {
        return siemResponse.error({ statusCode: 500, body: errors });
      } else {
        return response.ok({ body: validated ?? {} });
      }
    } catch (err) {
      const error = transformError(err);
      return siemResponse.error({
        body: error.message,
        statusCode: error.statusCode,
      });
    }
  };

  const factory = isRuleRegistryEnabled
    ? handleRequestFactory<RACCreateRulesSchema>()
    : handleRequestFactory<CreateRulesSchema>();
  const schema = isRuleRegistryEnabled ? racCreateRulesSchema : createRulesSchema;

  router.post(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation(schema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    factory
  );
};
