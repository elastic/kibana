/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ISavedObjectsRepository, SavedObject } from 'kibana/server';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import {
  DEFAULT_SEARCH_AFTER_PAGE_SIZE,
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
import { AlertAttributes, ThresholdAlertState } from '../../signals/types';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import {
  Alert,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../../../../alerting/common';
import {
  EqlRuleParams,
  InternalRuleCreate,
  MachineLearningRuleParams,
  QueryRuleParams,
  RuleParams,
  ThreatRuleParams,
  ThresholdRuleParams,
} from '../../schemas/rule_schemas';
import {
  createEqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createQueryAlertType,
  createThresholdAlertType,
} from '../../rule_types';
import { PersistenceServices } from '../../../../../../rule_registry/server';
import { ExecutorType } from '../../../../../../alerting/server/types';
import { parseInterval } from '../../signals/utils';
import { AlertInstance } from '../../../../../../alerting/server/alert_instance';
import { queryExecutor } from '../../signals/executors/query';
import { eqlExecutor } from '../../signals/executors/eql';
import { threatMatchExecutor } from '../../signals/executors/threat_match';
import { thresholdExecutor } from '../../signals/executors/threshold';
import { mlExecutor } from '../../signals/executors/ml';

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

        if (!siemClient /* || !rulesClient*/) {
          return siemResponse.error({ statusCode: 404 });
        }
        const internalRule = convertPreviewAPIToInternalSchema(request.body, siemClient);
        const runState: Record<string, unknown> = {};

        const { maxSignals } = internalRule.params;
        const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);
        let invocationCount = internalRule.invocationCount;

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));

        await context.lists?.getExceptionListClient().createEndpointList();

        const mockRuleSO: SavedObject<
          Pick<Alert<RuleParams>, 'createdBy' | 'createdAt' | 'updatedBy'>
        > = {
          id: 'preview_rule_so_id',
          references: [],
          type: 'rule',
          attributes: {
            createdBy: 'elastic_preview',
            createdAt: new Date(),
            updatedBy: 'elastic_preview',
            ...internalRule,
          },
        };

        const mockSavedObjectsClient = {
          get: (ruleId: string) => mockRuleSO,
        } as unknown as ISavedObjectsRepository;

        const { logger, ignoreFields, mergeStrategy } = previewRuleOptions;

        const previewRuleParams = internalRule.params;

        const runExecutors = async <
          TParams extends RuleParams,
          TState extends AlertTypeState,
          TInstanceState extends AlertInstanceState,
          TInstanceContext extends AlertInstanceContext,
          TActionGroupIds extends string
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

          let previousStartedAt = null;
          while (invocationCount > 0) {
            statePreview = (await executor({
              previousStartedAt,
              startedAt: startedAt.toDate(),
              state: statePreview,
              alertId: 'alertId',
              services: {
                alertInstanceFactory,
                savedObjectsClient: mockSavedObjectsClient,
                scopedClusterClient: {},
              },
              spaceId: 'asdf',
              updatedBy: 'preview-fake-user',
              params,
              actionGroupIds: '',
            })) as TState;
            previousStartedAt = startedAt.toDate();
            startedAt.add(parseInterval(internalRule.schedule.interval));
            invocationCount--;
          }
        };

        // TODO: pass the real savedObjectsClient but refactor the executor implementation not to use it for fetching rules, as we already have everything we need to execute the rule
        // TODO: preview rule status client should keep the errors & warnings in memory and return with the preview POST response

        switch (previewRuleParams.type) {
          case 'threat_match':
            await runExecutors(threatMatchExecutor, previewRuleParams);
            break;
          case 'eql':
            await runExecutors(eqlExecutor, previewRuleParams);
            break;
          case 'query':
            await runExecutors(queryExecutor, previewRuleParams);
            break;
          case 'threshold':
            await runExecutors(thresholdExecutor, previewRuleParams);
            break;
          case 'machine_learning':
            await runExecutors(mlExecutor, previewRuleParams);
            break;
          default:
        }

        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: previewData ?? {} });
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
