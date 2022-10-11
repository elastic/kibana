/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { StartPlugins, SetupPlugins } from '../../../../plugin';
import { buildSiemResponse } from '../utils';
import { convertCreateAPIToInternalSchema } from '../../schemas/rule_converters';
import { createPreviewRuleExecutionLogger } from '../../signals/preview/preview_rule_execution_logger';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwAuthzError } from '../../../machine_learning/validation';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import {
  DEFAULT_PREVIEW_INDEX,
  DETECTION_ENGINE_RULES_PROFILE,
} from '../../../../../common/constants';
import type { RulePreviewLogs } from '../../../../../common/detection_engine/schemas/request';
import { previewRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import type { RuleExecutionContext, StatusChangeArgs } from '../../rule_monitoring';

import type { ConfigType } from '../../../../config';
import type { CreateRuleOptions, CreateSecurityRuleTypeWrapperProps } from '../../rule_types/types';
import {
  createEqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createQueryAlertType,
  createSavedQueryAlertType,
  createThresholdAlertType,
  createNewTermsAlertType,
} from '../../rule_types';
import { createSecurityRuleTypeWrapper } from '../../rule_types/create_security_rule_type_wrapper';
import { assertUnreachable } from '../../../../../common/utility_types';
import {
  getEventProfile,
  getThreatListProfile,
} from '../../signals/threat_mapping/get_threat_profile';

const PREVIEW_TIMEOUT_SECONDS = 60;

export const getProfileRoute = async (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  security: SetupPlugins['security'],
  ruleOptions: CreateRuleOptions,
  securityRuleTypeOptions: CreateSecurityRuleTypeWrapperProps,
  previewRuleDataClient: IRuleDataClient,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_PROFILE,
      validate: {
        body: buildRouteValidation(previewRulesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = createRuleValidateTypeDependents(request.body);
      const coreContext = await context.core;
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }
      try {
        const [, { data, security: securityService }] = await getStartServices();
        const searchSourceClient = await data.search.searchSource.asScoped(request);
        const savedObjectsClient = coreContext.savedObjects.client;
        const { client } = (await context.core).elasticsearch;
        const esClient = client.asCurrentUser;

        const siemClient = (await context.securitySolution).getAppClient();
        const { getQueryRuleAdditionalOptions: queryRuleAdditionalOptions } =
          await context.securitySolution;

        const timeframeEnd = request.body.timeframeEnd;
        const invocationCount = request.body.invocationCount;
        if (invocationCount < 1) {
          return response.ok({
            body: { logs: [{ errors: ['Invalid invocation count'], warnings: [], duration: 0 }] },
          });
        }

        const internalRule = convertCreateAPIToInternalSchema(request.body);
        const previewRuleParams = internalRule.params;

        const mlAuthz = buildMlAuthz({
          license: (await context.licensing).license,
          ml,
          request,
          savedObjectsClient,
        });
        throwAuthzError(await mlAuthz.validateRuleType(internalRule.params.type));

        const listsContext = await context.lists;
        await listsContext?.getExceptionListClient().createEndpointList();

        const spaceId = siemClient.getSpaceId();
        const previewId = uuid.v4();
        const username = security?.authc.getCurrentUser(request)?.username;
        const loggedStatusChanges: Array<RuleExecutionContext & StatusChangeArgs> = [];
        const previewRuleExecutionLogger = createPreviewRuleExecutionLogger(loggedStatusChanges);
        const runState: Record<string, unknown> = {};
        const logs: RulePreviewLogs[] = [];
        const isAborted = false;

        const { hasAllRequested } = await securityService.authz
          .checkPrivilegesWithRequest(request)
          .atSpace(spaceId, {
            elasticsearch: {
              index: {
                [`${DEFAULT_PREVIEW_INDEX}`]: ['read'],
                [`.internal${DEFAULT_PREVIEW_INDEX}-`]: ['read'],
              },
              cluster: [],
            },
          });

        if (!hasAllRequested) {
          return response.ok({
            body: {
              logs: [
                {
                  errors: [
                    'Missing "read" privileges for the ".preview.alerts-security.alerts" or ".internal.preview.alerts-security.alerts" indices. Without these privileges you cannot use the Rule Preview feature.',
                  ],
                  warnings: [],
                  duration: 0,
                },
              ],
            },
          });
        }

        const previewRuleTypeWrapper = createSecurityRuleTypeWrapper({
          ...securityRuleTypeOptions,
          ruleDataClient: previewRuleDataClient,
          ruleExecutionLoggerFactory: previewRuleExecutionLogger.factory,
        });

        const runProfile = async (ruleTypeId: string, ruleTypeName: string, params: TParams) => {
          await Promise.all([
            getEventProfile({
              esClient,
              ...params,
            }),
            getThreatListProfile({
              esClient,
              ...params,
            }),
          ]);
        };

        switch (previewRuleParams.type) {
          // case 'query':
          //   const queryAlertType = previewRuleTypeWrapper(
          //     createQueryAlertType({ ...ruleOptions, ...queryRuleAdditionalOptions })
          //   );
          //   await runProfile(queryAlertType.id, queryAlertType.name, previewRuleParams);
          //   break;
          // case 'saved_query':
          //   const savedQueryAlertType = previewRuleTypeWrapper(
          //     createSavedQueryAlertType({ ...ruleOptions, ...queryRuleAdditionalOptions })
          //   );
          //   await runProfile(savedQueryAlertType.id, savedQueryAlertType.name, previewRuleParams);
          //   break;
          // case 'threshold':
          //   const thresholdAlertType = previewRuleTypeWrapper(
          //     createThresholdAlertType(ruleOptions)
          //   );
          //   await runProfile(thresholdAlertType.id, thresholdAlertType.name, previewRuleParams);
          //   break;
          case 'threat_match':
            const threatMatchAlertType = previewRuleTypeWrapper(
              createIndicatorMatchAlertType(ruleOptions)
            );
            await runProfile(threatMatchAlertType.id, threatMatchAlertType.name, previewRuleParams);
            break;
          // case 'eql':
          //   const eqlAlertType = previewRuleTypeWrapper(createEqlAlertType(ruleOptions));
          //   await runProfile(eqlAlertType.id, eqlAlertType.name, previewRuleParams);
          //   break;
          // case 'machine_learning':
          //   const mlAlertType = previewRuleTypeWrapper(createMlAlertType(ruleOptions));
          //   await runProfile(mlAlertType.id, mlAlertType.name, previewRuleParams);
          //   break;
          // case 'new_terms':
          //   const newTermsAlertType = previewRuleTypeWrapper(createNewTermsAlertType(ruleOptions));
          //   await runProfile(newTermsAlertType.id, newTermsAlertType.name, previewRuleParams);
          //   break;
          default:
            return response.ok({
              body: null,
            });
        }

        return response.ok({
          body: {
            previewId,
            logs,
            isAborted,
          },
        });
      } catch (err) {
        const error = transformError(err as Error);
        return siemResponse.error({
          body: {
            errors: [error.message],
          },
          statusCode: error.statusCode,
        });
      }
    }
  );
};
