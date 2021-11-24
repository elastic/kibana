/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// import moment from 'moment';
// import uuid from 'uuid';
// import { transformError } from '@kbn/securitysolution-es-utils';
// import { buildSiemResponse } from '../utils';
// import { convertCreateAPIToInternalSchema } from '../../schemas/rule_converters';
// import { RuleParams } from '../../schemas/rule_schemas';
// import { signalRulesAlertType } from '../../signals/signal_rule_alert_type';
// import { createWarningsAndErrors } from '../../signals/preview/preview_rule_execution_log_client';
// import { parseInterval } from '../../signals/utils';
// import { buildMlAuthz } from '../../../machine_learning/authz';
// import { throwHttpError } from '../../../machine_learning/validation';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
// import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { DETECTION_ENGINE_RULES_PREVIEW } from '../../../../../common/constants';
import { previewRulesSchema } from '../../../../../common/detection_engine/schemas/request';
// import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';

// import {
//   AlertInstanceContext,
//   AlertInstanceState,
//   AlertTypeState,
//   parseDuration,
// } from '../../../../../../alerting/common';
// // eslint-disable-next-line @kbn/eslint/no-restricted-paths
// import { ExecutorType } from '../../../../../../alerting/server/types';
// import { AlertInstance } from '../../../../../../alerting/server';
import { ConfigType } from '../../../../config';
// import { IEventLogService } from '../../../../../../event_log/server';
// import { alertInstanceFactoryStub } from '../../signals/preview/alert_instance_factory_stub';
import { CreateRuleOptions } from '../../rule_types/types';

// enum InvocationCount {
//   HOUR = 1,
//   DAY = 24,
//   WEEK = 168,
// }

export const previewRulesRoute = async (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  security: SetupPlugins['security'],
  ruleOptions: CreateRuleOptions
) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_PREVIEW,
      validate: {
        body: buildRouteValidation(previewRulesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      return response.ok({
        body: { errors: ['Indicator match rule previews are disabled'] },
      });
      //   const siemResponse = buildSiemResponse(response);
      //   const validationErrors = createRuleValidateTypeDependents(request.body);
      //   if (validationErrors.length) {
      //     return siemResponse.error({ statusCode: 400, body: validationErrors });
      //   }
      //   try {
      //     const savedObjectsClient = context.core.savedObjects.client;
      //     const siemClient = context.securitySolution?.getAppClient();
      //     if (!siemClient) {
      //       return siemResponse.error({ statusCode: 404 });
      //     }
      //
      //     if (request.body.type !== 'threat_match') {
      //       return response.ok({ body: { errors: ['Not an indicator match rule'] } });
      //     }
      //
      //     let invocationCount = request.body.invocationCount;
      //     if (
      //       ![InvocationCount.HOUR, InvocationCount.DAY, InvocationCount.WEEK].includes(
      //         invocationCount
      //       )
      //     ) {
      //       return response.ok({ body: { errors: ['Invalid invocation count'] } });
      //     }
      //
      //     const internalRule = convertCreateAPIToInternalSchema(request.body, siemClient, false);
      //     const previewRuleParams = internalRule.params;
      //
      //     const mlAuthz = buildMlAuthz({
      //       license: context.licensing.license,
      //       ml,
      //       request,
      //       savedObjectsClient,
      //     });
      //     throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));
      //     await context.lists?.getExceptionListClient().createEndpointList();
      //
      //     const spaceId = siemClient.getSpaceId();
      //     const previewIndex = siemClient.getPreviewIndex();
      //     const previewId = uuid.v4();
      //     const username = security?.authc.getCurrentUser(request)?.username;
      //     const { previewRuleExecutionLogClient, warningsAndErrorsStore } = createWarningsAndErrors();
      //     const runState: Record<string, unknown> = {};
      //
      //     const runExecutors = async <
      //       TParams extends RuleParams,
      //       TState extends AlertTypeState,
      //       TInstanceState extends AlertInstanceState,
      //       TInstanceContext extends AlertInstanceContext,
      //       TActionGroupIds extends string = ''
      //     >(
      //       executor: ExecutorType<
      //         TParams,
      //         TState,
      //         TInstanceState,
      //         TInstanceContext,
      //         TActionGroupIds
      //       >,
      //       ruleTypeId: string,
      //       ruleTypeName: string,
      //       params: TParams,
      //       alertInstanceFactory: (
      //         id: string
      //       ) => Pick<
      //         AlertInstance<TInstanceState, TInstanceContext, TActionGroupIds>,
      //         'getState' | 'replaceState' | 'scheduleActions' | 'scheduleActionsWithSubGroup'
      //       >
      //     ) => {
      //       let statePreview = runState as TState;
      //
      //       const startedAt = moment();
      //       const parsedDuration = parseDuration(internalRule.schedule.interval) ?? 0;
      //       startedAt.subtract(moment.duration(parsedDuration * invocationCount));
      //
      //       let previousStartedAt = null;
      //
      //       const rule = {
      //         ...internalRule,
      //         createdAt: new Date(),
      //         createdBy: username ?? 'preview-created-by',
      //         producer: 'preview-producer',
      //         ruleTypeId,
      //         ruleTypeName,
      //         updatedAt: new Date(),
      //         updatedBy: username ?? 'preview-updated-by',
      //       };
      //
      //       while (invocationCount > 0) {
      //         statePreview = (await executor({
      //           alertId: previewId,
      //           createdBy: rule.createdBy,
      //           name: rule.name,
      //           params,
      //           previousStartedAt,
      //           rule,
      //           services: {
      //             alertInstanceFactory,
      //             savedObjectsClient: context.core.savedObjects.client,
      //             scopedClusterClient: context.core.elasticsearch.client,
      //           },
      //           spaceId,
      //           startedAt: startedAt.toDate(),
      //           state: statePreview,
      //           tags: [],
      //           updatedBy: rule.updatedBy,
      //         })) as TState;
      //         previousStartedAt = startedAt.toDate();
      //         startedAt.add(parseInterval(internalRule.schedule.interval));
      //         invocationCount--;
      //       }
      //     };
      //
      //     const signalRuleAlertType = signalRulesAlertType({
      //       ...ruleOptions,
      //       lists: context.lists,
      //       config,
      //       indexNameOverride: previewIndex,
      //       ruleExecutionLogClientOverride: previewRuleExecutionLogClient,
      //       // unused as we override the ruleExecutionLogClient
      //       eventLogService: {} as unknown as IEventLogService,
      //       eventsTelemetry: undefined,
      //       ml: undefined,
      //       refreshOverride: 'wait_for',
      //     });
      //
      //     await runExecutors(
      //       signalRuleAlertType.executor,
      //       signalRuleAlertType.id,
      //       signalRuleAlertType.name,
      //       previewRuleParams,
      //       alertInstanceFactoryStub
      //     );
      //
      //     const errors = warningsAndErrorsStore
      //       .filter((item) => item.newStatus === RuleExecutionStatus.failed)
      //       .map((item) => item.message);
      //
      //     const warnings = warningsAndErrorsStore
      //       .filter(
      //         (item) =>
      //           item.newStatus === RuleExecutionStatus['partial failure'] ||
      //           item.newStatus === RuleExecutionStatus.warning
      //       )
      //       .map((item) => item.message);
      //
      //     return response.ok({
      //       body: {
      //         previewId,
      //         errors,
      //         warnings,
      //       },
      //     });
      //   } catch (err) {
      //     const error = transformError(err as Error);
      //     return siemResponse.error({
      //       body: {
      //         errors: [error.message],
      //       },
      //       statusCode: error.statusCode,
      //     });
      //   }
    }
  );
};
