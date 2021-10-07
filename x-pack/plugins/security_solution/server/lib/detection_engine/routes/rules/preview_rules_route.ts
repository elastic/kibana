/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import uuid from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import {
  DEFAULT_PREVIEW_INDEX,
  DETECTION_ENGINE_RULES_PREVIEW,
} from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { buildSiemResponse } from '../utils';

import { previewRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { convertPreviewAPIToInternalSchema } from '../../schemas/rule_converters';
import { PreviewRuleOptions } from '../../rule_types/types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeState,
} from '../../../../../../alerting/common';
import { RuleParams } from '../../schemas/rule_schemas';
import { parseInterval } from '../../signals/utils';
import { signalRulesAlertType } from '../../signals/signal_rule_alert_type';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExecutorType } from '../../../../../../alerting/server/types';
import { createWarningsAndErrors } from '../../signals/preview/preview_rule_execution_log_client';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertInstance } from '../../../../../../alerting/server/alert_instance';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';

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
        const previewId = uuid.v4();

        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient /* || !rulesClient*/) {
          return siemResponse.error({ statusCode: 404 });
        }
        const internalRule = convertPreviewAPIToInternalSchema(request.body, siemClient);
        const runState: Record<string, unknown> = {};

        // const { maxSignals } = internalRule.params;
        // const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);
        let invocationCount = internalRule.invocationCount;

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));

        await context.lists?.getExceptionListClient().createEndpointList();

        const previewRuleParams = internalRule.params;

        const { previewRuleExecutionLogClient, warningsAndErrorsStore } = createWarningsAndErrors();

        const spaceId = siemClient.getSpaceId();

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
          params: TParams
        ) => {
          const previewAlertInstanceFactory = (id: string) => ({
            getState() {
              return {} as unknown as TInstanceState;
            },
            replaceState(state: TInstanceState) {
              return new AlertInstance<TInstanceState, TInstanceContext, TActionGroupIds>({
                state: {} as TInstanceState,
                meta: { lastScheduledActions: { group: 'default', date: new Date() } },
              });
            },
            scheduleActions(actionGroup: TActionGroupIds, alertcontext: TInstanceContext) {
              return new AlertInstance<TInstanceState, TInstanceContext, TActionGroupIds>({
                state: {} as TInstanceState,
                meta: { lastScheduledActions: { group: 'default', date: new Date() } },
              });
            },
            scheduleActionsWithSubGroup(
              actionGroup: TActionGroupIds,
              subgroup: string,
              alertcontext: TInstanceContext
            ) {
              return new AlertInstance<TInstanceState, TInstanceContext, TActionGroupIds>({
                state: {} as TInstanceState,
                meta: { lastScheduledActions: { group: 'default', date: new Date() } },
              });
            },
          });

          let statePreview = runState as TState;

          const startedAt = moment();
          for (let i = 0; i < invocationCount; i++) {
            startedAt.subtract(parseInterval(internalRule.schedule.interval));
          }

          let previousStartedAt = null;

          const rule = {
            ...internalRule,
            createdBy: 'preview-created-by',
            updatedBy: 'preview-updated-by',
            createdAt: new Date(),
            updatedAt: new Date(),
            producer: 'preview-producer',
            ruleTypeId: 'preview-rule-type-id',
            ruleTypeName: 'preview-rule-type-name',
          };

          while (invocationCount > 0) {
            statePreview = (await executor({
              previousStartedAt,
              startedAt: startedAt.toDate(),
              state: statePreview,
              alertId: previewId,
              services: {
                alertInstanceFactory: previewAlertInstanceFactory,
                savedObjectsClient: context.core.savedObjects.client,
                scopedClusterClient: context.core.elasticsearch.client,
              },
              spaceId,
              updatedBy: rule.updatedBy,
              createdBy: rule.createdBy,
              params,
              tags: [],
              name: 'preview',
              rule,
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
          previewRuleParams
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
