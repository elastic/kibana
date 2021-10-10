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
import { convertPreviewAPIToInternalSchema } from '../../schemas/rule_converters';
import { PreviewRuleOptions } from '../../rule_types/types';
import { RuleParams } from '../../schemas/rule_schemas';
import { signalRulesAlertType } from '../../signals/signal_rule_alert_type';
import { previewAlertInstanceFactory } from '../../signals/preview/preview_alert_instance_factory';
import { createWarningsAndErrors } from '../../signals/preview/preview_rule_execution_log_client';
import { parseInterval } from '../../signals/utils';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import {
  DEFAULT_PREVIEW_INDEX,
  DETECTION_ENGINE_RULES_PREVIEW,
} from '../../../../../common/constants';
import { previewRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';

import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeState,
} from '../../../../../../alerting/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExecutorType } from '../../../../../../alerting/server/types';
import { AlertInstance } from '../../../../../../alerting/server';

export const previewRulesRoute = async (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  previewRuleOptions: PreviewRuleOptions
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

        const internalRule = convertPreviewAPIToInternalSchema(request.body, siemClient);
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
        const previewId = uuid.v4();
        const { previewRuleExecutionLogClient, warningsAndErrorsStore } = createWarningsAndErrors();
        let invocationCount = internalRule.invocationCount;
        const runState: Record<string, unknown> = {};

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
          params: TParams,
          alertInstanceFactory: (
            id: string
          ) => Pick<
            AlertInstance<TInstanceState, TInstanceContext, TActionGroupIds>,
            'getState' | 'replaceState' | 'scheduleActions' | 'scheduleActionsWithSubGroup'
          >
        ) => {
          let statePreview = runState as TState;

          const startedAt = moment();
          for (let i = 0; i < invocationCount; i++) {
            startedAt.subtract(parseInterval(internalRule.schedule.interval));
          }

          let previousStartedAt = null;

          const rule = {
            ...internalRule,
            createdAt: new Date(),
            createdBy: 'preview-created-by',
            producer: 'preview-producer',
            ruleTypeId: 'preview-rule-type-id',
            ruleTypeName: 'preview-rule-type-name',
            updatedAt: new Date(),
            updatedBy: 'preview-updated-by',
          };

          while (invocationCount > 0) {
            statePreview = (await executor({
              alertId: previewId,
              createdBy: rule.createdBy,
              name: 'preview',
              params,
              previousStartedAt,
              rule,
              services: {
                alertInstanceFactory,
                savedObjectsClient: context.core.savedObjects.client,
                scopedClusterClient: context.core.elasticsearch.client,
              },
              spaceId,
              startedAt: startedAt.toDate(),
              state: statePreview,
              tags: [],
              updatedBy: rule.updatedBy,
            })) as TState;
            previousStartedAt = startedAt.toDate();
            startedAt.add(parseInterval(internalRule.schedule.interval));
            invocationCount--;
          }
        };

        await runExecutors(
          signalRulesAlertType({
            ...previewRuleOptions,
            indexNameOverride: `${DEFAULT_PREVIEW_INDEX}-${spaceId}`,
            ruleExecutionLogClientOverride: previewRuleExecutionLogClient,
          }).executor,
          previewRuleParams,
          previewAlertInstanceFactory
        );

        const errors = warningsAndErrorsStore.filter(
          (item) => item.newStatus === RuleExecutionStatus.failed
        );

        if (errors.length) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({
            body: {
              previewId,
              warnings: warningsAndErrorsStore,
            },
          });
        }
      } catch (err) {
        const error = transformError(err as Error);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
