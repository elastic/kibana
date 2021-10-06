/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import uuid from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import { SavedObjectsFindResult } from 'kibana/server';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { DETECTION_ENGINE_RULES_PREVIEW } from '../../../../../common/constants';
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
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertInstance } from '../../../../../../alerting/server/alert_instance';
import { RuleExecutionLogClient } from '../../rule_execution_log/rule_execution_log_client';
import {
  ExecutionMetric,
  ExecutionMetricArgs,
  FindBulkExecutionLogArgs,
  FindBulkExecutionLogResponse,
  FindExecutionLogArgs,
  LogStatusChangeArgs,
  UpdateExecutionLogArgs,
} from '../../rule_execution_log/types';
import { IRuleStatusSOAttributes } from '../../rules/types';

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

        const previewRuleExecutionLogClient: RuleExecutionLogClient = {
          client: undefined,
          async delete(id: string): Promise<void> {
            return Promise.resolve(undefined);
          },
          find(
            args: FindExecutionLogArgs
          ): Promise<Array<SavedObjectsFindResult<IRuleStatusSOAttributes>>> {
            return Promise.resolve([]);
          },
          findBulk(args: FindBulkExecutionLogArgs): Promise<FindBulkExecutionLogResponse> {
            return Promise.resolve([]);
          },
          async logExecutionMetric<T extends ExecutionMetric>(
            args: ExecutionMetricArgs<T>
          ): Promise<void> {
            return Promise.resolve(undefined);
          },
          async logStatusChange(args: LogStatusChangeArgs): Promise<void> {
            return Promise.resolve(undefined);
          },
          async update(args: UpdateExecutionLogArgs): Promise<void> {
            return Promise.resolve(undefined);
          },
        };

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
          let statePreview = runState as TState;

          const startedAt = moment();
          for (let i = 0; i < invocationCount; i++) {
            startedAt.subtract(parseInterval(internalRule.schedule.interval));
          }

          let previousStartedAt = null;

          const rule = {
            ...internalRule,
            createdBy: 'preview-fake-user',
            updatedBy: 'preview-fake-user',
            createdAt: new Date(),
            updatedAt: new Date(),
            producer: 'preview-fake-producer',
            ruleTypeId: 'preview-fake-ruleTypeId',
            ruleTypeName: 'preview',
          };

          while (invocationCount > 0) {
            statePreview = (await executor({
              previousStartedAt,
              startedAt: startedAt.toDate(),
              state: statePreview,
              alertId: previewId,
              services: {
                alertInstanceFactory,
                savedObjectsClient: context.core.savedObjects.client,
                scopedClusterClient: context.core.elasticsearch.client,
              },
              spaceId: siemClient.getSpaceId(),
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

          return [null, 'PLACEHOLDER_previewDataIdToQueryThePreviewIndex'];
        };

        // TODO: pass the real savedObjectsClient but refactor the executor implementation not to use it for fetching rules, as we already have everything we need to execute the rule
        // TODO: preview rule status client should keep the errors & warnings in memory and return with the preview POST response

        const [errors] = await runExecutors(
          signalRulesAlertType({
            ...previewRuleOptions,
            ruleExecutionLogClientOverride: previewRuleExecutionLogClient,
          }).executor,
          previewRuleParams
        );

        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: previewId ?? '' });
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
const alertInstanceFactory = (id: string) => ({
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
