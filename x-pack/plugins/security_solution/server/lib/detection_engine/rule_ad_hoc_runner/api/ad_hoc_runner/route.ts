/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import { QUERY_RULE_TYPE_ID, SAVED_QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { parseDuration, DISABLE_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import type { ExecutorType } from '@kbn/alerting-plugin/server/types';
import type { Alert } from '@kbn/alerting-plugin/server';

import * as t from 'io-ts';
import { RuleMonitoringService } from '@kbn/alerting-plugin/server/monitoring/rule_monitoring_service';
import { RuleResultService } from '@kbn/alerting-plugin/server/monitoring/rule_result_service';
import { DETECTION_ENGINE_RULES_AD_HOC_RUNNER } from '../../../../../../common/constants';

// import { RuleExecutionStatus } from '../../../../../../common/detection_engine/rule_monitoring';
import type { RulePreviewLogs } from '../../../../../../common/detection_engine/rule_schema';

import type { StartPlugins, SetupPlugins } from '../../../../../plugin';
import { buildSiemResponse } from '../../../routes/utils';
import type {
  EqlRuleParams,
  MachineLearningRuleParams,
  NewTermsRuleParams,
  QueryRuleParams,
  RuleParams,
  SavedQueryRuleParams,
  ThreatRuleParams,
  ThresholdRuleParams,
} from '../../../rule_schema/model/rule_schemas';
import { parseInterval } from '../../../rule_types/utils/utils';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

// import type { IRuleExecutionLogService, RuleExecutionContext, StatusChangeArgs } from '../../../rule_monitoring';

import type { ConfigType } from '../../../../../config';

import type {
  CreateRuleOptions,
  CreateSecurityRuleTypeWrapperProps,
} from '../../../rule_types/types';
import {
  createEqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createQueryAlertType,
  createThresholdAlertType,
  createNewTermsAlertType,
} from '../../../rule_types';
import { createSecurityRuleTypeWrapper } from '../../../rule_types/create_security_rule_type_wrapper';
import { assertUnreachable } from '../../../../../../common/utility_types';

/* Helpers imported from rule_preview */
// import { createPreviewRuleExecutionLogger } from '../../../rule_preview/api/preview_rules/preview_rule_execution_logger';
import { wrapScopedClusterClient } from '../../../rule_preview/api/preview_rules/wrap_scoped_cluster_client';
import { wrapSearchSourceClient } from '../../../rule_preview/api/preview_rules/wrap_search_source_client';
import { alertInstanceFactoryStub } from '../../../rule_preview/api/preview_rules/alert_instance_factory_stub';
import { getInvocationCountFromTimeRange } from '../logic/get_invocation_count_from_time_range';
import type { IRuleExecutionLogService } from '../../../rule_monitoring';

const PREVIEW_TIMEOUT_SECONDS = 60;
const MAX_ROUTE_CONCURRENCY = 10;

export const adHocRunnerRoute = async (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  security: SetupPlugins['security'],
  ruleOptions: CreateRuleOptions,
  securityRuleTypeOptions: CreateSecurityRuleTypeWrapperProps,
  adHocRunnerDataClient: IRuleDataClient,
  ruleExecutionLogService: IRuleExecutionLogService,
  getStartServices: StartServicesAccessor<StartPlugins>,
  logger: Logger
) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_AD_HOC_RUNNER,
      validate: {
        body: buildRouteValidation(
          t.type({
            ruleId: t.string,
            timeframeStart: t.string,
            timeframeEnd: t.string,
            interval: t.string,
          })
        ),
      },
      options: {
        tags: ['access:securitySolution', routeLimitedConcurrencyTag(MAX_ROUTE_CONCURRENCY)],
      },
    },
    async (context, request, response) => {
      const rulesClient = (await context.alerting).getRulesClient();
      const siemResponse = buildSiemResponse(response);
      const coreContext = await context.core;
      try {
        const [, { data, share, dataViews }] = await getStartServices();
        const searchSourceClient = await data.search.searchSource.asScoped(request);
        const savedObjectsClient = coreContext.savedObjects.client;
        const siemClient = (await context.securitySolution).getAppClient();

        const { timeframeStart, timeframeEnd, interval } = request.body;
        let invocationCount = getInvocationCountFromTimeRange({
          timeframeStart,
          timeframeEnd,
          interval,
        });

        const initialInvocationCount = invocationCount;

        if (invocationCount < 1) {
          return response.ok({
            body: { logs: [{ errors: ['Invalid invocation count'], warnings: [], duration: 0 }] },
          });
        }

        const rule = await rulesClient.resolve<RuleParams>({ id: request.body.ruleId });

        const mlAuthz = buildMlAuthz({
          license: (await context.licensing).license,
          ml,
          request,
          savedObjectsClient,
        });
        throwAuthzError(await mlAuthz.validateRuleType(rule.params.type));

        const listsContext = await context.lists;
        await listsContext?.getExceptionListClient().createEndpointList();

        const spaceId = siemClient.getSpaceId();
        const adHocRunId = uuidv4();
        const username = security?.authc.getCurrentUser(request)?.username;
        // const loggedStatusChanges: Array<RuleExecutionContext & StatusChangeArgs> = [];
        // const previewRuleExecutionLogger = createPreviewRuleExecutionLogger(loggedStatusChanges);
        const runState: Record<string, unknown> = {};
        const logs: RulePreviewLogs[] = [];
        let isAborted = false;
        const uniqueExecutionId = uuidv4();

        const ruleMonitoringService = new RuleMonitoringService().getLastRunMetricsSetters();
        const ruleResultService = new RuleResultService().getLastRunSetters();

        const adHocRunnerRuleTypeWrapper = createSecurityRuleTypeWrapper({
          ...securityRuleTypeOptions,
          ruleDataClient: adHocRunnerDataClient,
          ruleExecutionLoggerFactory: ruleExecutionLogService.createClientForExecutors,
          isPreview: false,
        });

        const runExecutors = async <
          TParams extends RuleParams,
          TState extends RuleTypeState,
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
          shouldWriteAlerts: () => boolean,
          alertFactory: {
            create: (
              id: string
            ) => Pick<
              Alert<TInstanceState, TInstanceContext, TActionGroupIds>,
              | 'getState'
              | 'replaceState'
              | 'scheduleActions'
              | 'setContext'
              | 'getContext'
              | 'hasContext'
              | 'getUuid'
            >;
            alertLimit: {
              getValue: () => number;
              setLimitReached: () => void;
            };
            done: () => { getRecoveredAlerts: () => [] };
          }
        ) => {
          let statePreview = runState as TState;

          const abortController = new AbortController();
          setTimeout(() => {
            abortController.abort();
            isAborted = true;
          }, PREVIEW_TIMEOUT_SECONDS * 1000);

          const startedAt = moment(timeframeEnd);
          const parsedDuration = parseDuration(rule.schedule.interval) ?? 0;
          startedAt.subtract(moment.duration(parsedDuration * (invocationCount - 1)));

          let previousStartedAt = null;

          // TODO: Review all of these
          const ruleToExecute = {
            ...rule,
            id: rule.id ?? uuidv4(),
            createdBy: username ?? 'ad-hoc-runner-created-by',
            producer: 'ad-hoc-runner-producer',
            revision: 0,
            ruleTypeId,
            ruleTypeName,
            updatedAt: new Date(),
            updatedBy: username ?? 'ad-hoc-runner-updated-by',
            muteAll: false,
            snoozeSchedule: [],
          };

          // let invocationStartTime;

          const dataViewsService = await dataViews.dataViewsServiceFactory(
            savedObjectsClient,
            coreContext.elasticsearch.client.asInternalUser
          );

          while (invocationCount > 0 && !isAborted) {
            // invocationStartTime = moment();

            ({ state: statePreview } = (await executor({
              executionId: uniqueExecutionId,
              params,
              previousStartedAt,
              rule: ruleToExecute,
              services: {
                shouldWriteAlerts,
                shouldStopExecution: () => false,
                alertFactory,
                savedObjectsClient: coreContext.savedObjects.client,
                scopedClusterClient: wrapScopedClusterClient({
                  abortController,
                  scopedClusterClient: coreContext.elasticsearch.client,
                }),
                searchSourceClient: wrapSearchSourceClient({
                  abortController,
                  searchSourceClient,
                }),
                ruleMonitoringService,
                ruleResultService,
                uiSettingsClient: coreContext.uiSettings.client,
                dataViews: dataViewsService,
                share,
              },
              spaceId,
              startedAt: startedAt.toDate(),
              state: statePreview,
              logger,
              flappingSettings: DISABLE_FLAPPING_SETTINGS,
            })) as { state: TState });

            // const errors = loggedStatusChanges
            //   .filter((item) => item.newStatus === RuleExecutionStatus.failed)
            //   .map((item) => item.message ?? 'Unknown Error');

            // const warnings = loggedStatusChanges
            //   .filter((item) => item.newStatus === RuleExecutionStatus['partial failure'])
            //   .map((item) => item.message ?? 'Unknown Warning');

            // logs.push({
            //   errors,
            //   warnings,
            //   startedAt: startedAt.toDate().toISOString(),
            //   duration: moment().diff(invocationStartTime, 'milliseconds'),
            // });

            // loggedStatusChanges.length = 0;

            // if (errors.length) {
            //   break;
            // }

            previousStartedAt = startedAt.toDate();
            startedAt.add(parseInterval(rule.schedule.interval));
            invocationCount--;
          }
        };

        const ruleParamsForExecutors: RuleParams = {
          ...rule.params,
          // Need to override the timestamp otherwise the alerts
          // get created when the execution gets run
          // instead of when the event happened
          timestampOverride: 'event.start',
          timestampOverrideFallbackDisabled: true,
        };

        switch (rule.params.type) {
          case 'query':
            const queryAlertType = adHocRunnerRuleTypeWrapper(
              createQueryAlertType({
                ...ruleOptions,
                id: QUERY_RULE_TYPE_ID,
                name: 'Custom Query Rule',
              })
            );
            await runExecutors(
              queryAlertType.executor,
              queryAlertType.id,
              queryAlertType.name,
              ruleParamsForExecutors as QueryRuleParams,
              () => true,
              {
                create: alertInstanceFactoryStub,
                alertLimit: {
                  getValue: () => 1000,
                  setLimitReached: () => {},
                },
                done: () => ({ getRecoveredAlerts: () => [] }),
              }
            );
            break;
          case 'saved_query':
            const savedQueryAlertType = adHocRunnerRuleTypeWrapper(
              createQueryAlertType({
                ...ruleOptions,
                id: SAVED_QUERY_RULE_TYPE_ID,
                name: 'Saved Query Rule',
              })
            );
            await runExecutors(
              savedQueryAlertType.executor,
              savedQueryAlertType.id,
              savedQueryAlertType.name,
              ruleParamsForExecutors as SavedQueryRuleParams,
              () => true,
              {
                create: alertInstanceFactoryStub,
                alertLimit: {
                  getValue: () => 1000,
                  setLimitReached: () => {},
                },
                done: () => ({ getRecoveredAlerts: () => [] }),
              }
            );
            break;
          case 'threshold':
            const thresholdAlertType = adHocRunnerRuleTypeWrapper(
              createThresholdAlertType(ruleOptions)
            );
            await runExecutors(
              thresholdAlertType.executor,
              thresholdAlertType.id,
              thresholdAlertType.name,
              ruleParamsForExecutors as ThresholdRuleParams,
              () => true,
              {
                create: alertInstanceFactoryStub,
                alertLimit: {
                  getValue: () => 1000,
                  setLimitReached: () => {},
                },
                done: () => ({ getRecoveredAlerts: () => [] }),
              }
            );
            break;
          case 'threat_match':
            const threatMatchAlertType = adHocRunnerRuleTypeWrapper(
              createIndicatorMatchAlertType(ruleOptions)
            );
            await runExecutors(
              threatMatchAlertType.executor,
              threatMatchAlertType.id,
              threatMatchAlertType.name,
              ruleParamsForExecutors as ThreatRuleParams,
              () => true,
              {
                create: alertInstanceFactoryStub,
                alertLimit: {
                  getValue: () => 1000,
                  setLimitReached: () => {},
                },
                done: () => ({ getRecoveredAlerts: () => [] }),
              }
            );
            break;
          case 'eql':
            const eqlAlertType = adHocRunnerRuleTypeWrapper(createEqlAlertType(ruleOptions));
            await runExecutors(
              eqlAlertType.executor,
              eqlAlertType.id,
              eqlAlertType.name,
              ruleParamsForExecutors as EqlRuleParams,
              () => true,
              {
                create: alertInstanceFactoryStub,
                alertLimit: {
                  getValue: () => 1000,
                  setLimitReached: () => {},
                },
                done: () => ({ getRecoveredAlerts: () => [] }),
              }
            );
            break;
          case 'machine_learning':
            const mlAlertType = adHocRunnerRuleTypeWrapper(createMlAlertType(ruleOptions));
            await runExecutors(
              mlAlertType.executor,
              mlAlertType.id,
              mlAlertType.name,
              ruleParamsForExecutors as MachineLearningRuleParams,
              () => true,
              {
                create: alertInstanceFactoryStub,
                alertLimit: {
                  getValue: () => 1000,
                  setLimitReached: () => {},
                },
                done: () => ({ getRecoveredAlerts: () => [] }),
              }
            );
            break;
          case 'new_terms':
            const newTermsAlertType = adHocRunnerRuleTypeWrapper(
              createNewTermsAlertType(ruleOptions)
            );
            await runExecutors(
              newTermsAlertType.executor,
              newTermsAlertType.id,
              newTermsAlertType.name,
              ruleParamsForExecutors as NewTermsRuleParams,
              () => true,
              {
                create: alertInstanceFactoryStub,
                alertLimit: {
                  getValue: () => 1000,
                  setLimitReached: () => {},
                },
                done: () => ({ getRecoveredAlerts: () => [] }),
              }
            );
            break;
          default:
            assertUnreachable(rule.params);
        }

        // Refreshes alias to ensure index is able to be read before returning
        await coreContext.elasticsearch.client.asInternalUser.indices.refresh(
          {
            index: adHocRunnerDataClient.indexNameWithNamespace(spaceId),
          },
          { ignore: [404] }
        );

        return response.ok({
          body: {
            adHocRunId,
            initialInvocationCount,
            executionId: uniqueExecutionId,
            logs: [],
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
