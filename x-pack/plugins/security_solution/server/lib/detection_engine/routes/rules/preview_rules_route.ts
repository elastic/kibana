/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import uuid from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';

import { buildSiemResponse } from '../utils';
import { convertCreateAPIToInternalSchema } from '../../schemas/rule_converters';
import { PreviewRuleOptions } from '../../rule_types/types';
import { RuleParams } from '../../schemas/rule_schemas';
import { signalRulesAlertType } from '../../signals/signal_rule_alert_type';
import { createWarningsAndErrors } from '../../signals/preview/preview_rule_execution_log_client';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { DETECTION_ENGINE_RULES_PREVIEW } from '../../../../../common/constants';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';

import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeState,
  parseDuration,
} from '../../../../../../alerting/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExecutorType } from '../../../../../../alerting/server/types';
import { AlertInstance } from '../../../../../../alerting/server';
import { ConfigType } from '../../../../config';
import { IEventLogService } from '../../../../../../event_log/server';
import { alertInstanceFactoryStub } from '../../signals/preview/alert_instance_factory_stub';
import { createRulesSchema } from '../../../../../common/detection_engine/schemas/request';

export const previewRulesRoute = async (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  previewRuleOptions: PreviewRuleOptions,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_PREVIEW,
      validate: {
        body: buildRouteValidation(createRulesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = createRuleValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }
      try {
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        if (request.body.type !== 'threat_match') {
          return response.ok({ body: { errors: ['Not an indicator match rule'] } });
        }

        const internalRule = convertCreateAPIToInternalSchema(request.body, siemClient, false);
        const previewRuleParams = internalRule.params;

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));
        await context.lists?.getExceptionListClient().createEndpointList();

        const spaceId = siemClient.getSpaceId();
        const previewIndex = siemClient.getPreviewIndex();
        const previewId = uuid.v4();
        const username = security?.authc.getCurrentUser(request)?.username;
        const { previewRuleExecutionLogClient, warningsAndErrorsStore } = createWarningsAndErrors();

        const runExecutors = async <
          TParams extends RuleParams,
          TState extends AlertTypeState,
          TInstanceState extends AlertInstanceState,
          TInstanceContext extends AlertInstanceContext,
          TActionGroupIds extends string = ''
        >(
          executor: ExecutorType<
            TParams,
            TState,
            TInstanceState,
            TInstanceContext,
            TActionGroupIds
          >,
          ruleTypeId: string,
          ruleTypeName: string,
          params: TParams,
          alertInstanceFactory: (
            id: string
          ) => Pick<
            AlertInstance<TInstanceState, TInstanceContext, TActionGroupIds>,
            'getState' | 'replaceState' | 'scheduleActions' | 'scheduleActionsWithSubGroup'
          >
        ) => {
          const rule = {
            ...internalRule,
            createdAt: new Date(),
            createdBy: username ?? 'preview-created-by',
            producer: 'preview-producer',
            ruleTypeId,
            ruleTypeName,
            updatedAt: new Date(),
            updatedBy: username ?? 'preview-updated-by',
          };

          await executor({
            alertId: previewId,
            createdBy: rule.createdBy,
            name: rule.name,
            params,
            previousStartedAt: null,
            rule,
            services: {
              alertInstanceFactory,
              savedObjectsClient: context.core.savedObjects.client,
              scopedClusterClient: context.core.elasticsearch.client,
            },
            spaceId,
            startedAt: moment()
              .subtract(moment.duration(parseDuration(internalRule.schedule.interval)))
              .toDate(),
            state: {} as TState,
            tags: [],
            updatedBy: rule.updatedBy,
          });
        };

        const signalRuleAlertType = signalRulesAlertType({
          ...previewRuleOptions,
          lists: context.lists,
          config,
          indexNameOverride: `${previewIndex}-${spaceId}`,
          ruleExecutionLogClientOverride: previewRuleExecutionLogClient,
          // unused as we override the ruleExecutionLogClient
          eventLogService: {} as unknown as IEventLogService,
          eventsTelemetry: undefined,
          ml: undefined,
        });

        await runExecutors(
          signalRuleAlertType.executor,
          signalRuleAlertType.id,
          signalRuleAlertType.name,
          previewRuleParams,
          alertInstanceFactoryStub
        );

        const errors = warningsAndErrorsStore
          .filter((item) => item.newStatus === RuleExecutionStatus.failed)
          .map((item) => item.message);

        const warnings = warningsAndErrorsStore
          .filter(
            (item) =>
              item.newStatus === RuleExecutionStatus['partial failure'] ||
              item.newStatus === RuleExecutionStatus.warning
          )
          .map((item) => item.message);

        return response.ok({
          body: {
            previewId,
            errors,
            warnings,
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
