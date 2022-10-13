/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import uuid from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { parseDuration } from '@kbn/alerting-plugin/common';
import type { ExecutorType } from '@kbn/alerting-plugin/server/types';
import type { Alert } from '@kbn/alerting-plugin/server';
import type { StartPlugins, SetupPlugins } from '../../../../../plugin';
import { buildSiemResponse } from '../../../routes/utils';
import { convertCreateAPIToInternalSchema } from '../../../rule_management';
import type { RuleParams } from '../../../rule_schema';
import { createPreviewRuleExecutionLogger } from '../../../signals/preview/preview_rule_execution_logger';
import { parseInterval } from '../../../signals/utils';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { createRuleValidateTypeDependents } from '../../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import {
  DEFAULT_PREVIEW_INDEX,
  DETECTION_ENGINE_RULES_PREVIEW,
} from '../../../../../../common/constants';
import type { RulePreviewLogs } from '../../../../../../common/detection_engine/schemas/request';
import { previewRulesSchema } from '../../../../../../common/detection_engine/schemas/request';
import { RuleExecutionStatus } from '../../../../../../common/detection_engine/rule_monitoring';
import type { RuleExecutionContext, StatusChangeArgs } from '../../../rule_monitoring';

import type { ConfigType } from '../../../../../config';
import { alertInstanceFactoryStub } from '../../../signals/preview/alert_instance_factory_stub';
import type {
  CreateRuleOptions,
  CreateSecurityRuleTypeWrapperProps,
} from '../../../rule_types/types';
import {
  createEqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createQueryAlertType,
  createSavedQueryAlertType,
  createThresholdAlertType,
  createNewTermsAlertType,
} from '../../../rule_types';
import { createSecurityRuleTypeWrapper } from '../../../rule_types/create_security_rule_type_wrapper';
import { assertUnreachable } from '../../../../../../common/utility_types';
import { wrapScopedClusterClient } from './wrap_scoped_cluster_client';
import { wrapSearchSourceClient } from './wrap_search_source_client';

const PREVIEW_TIMEOUT_SECONDS = 60;

export const previewRulesRoute = async (
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
      const coreContext = await context.core;
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }
      try {
        const [, { data, security: securityService }] = await getStartServices();
        const searchSourceClient = await data.search.searchSource.asScoped(request);
        const savedObjectsClient = coreContext.savedObjects.client;
        const siemClient = (await context.securitySolution).getAppClient();
        const { getQueryRuleAdditionalOptions: queryRuleAdditionalOptions } =
          await context.securitySolution;

        const timeframeEnd = request.body.timeframeEnd;
        let invocationCount = request.body.invocationCount;
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
        let isAborted = false;

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
          const parsedDuration = parseDuration(internalRule.schedule.interval) ?? 0;
          startedAt.subtract(moment.duration(parsedDuration * (invocationCount - 1)));

          let previousStartedAt = null;

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

          let invocationStartTime;

          while (invocationCount > 0 && !isAborted) {
            invocationStartTime = moment();

            statePreview = (await executor({
              alertId: previewId,
              createdBy: rule.createdBy,
              executionId: uuid.v4(),
              name: rule.name,
              params,
              previousStartedAt,
              rule,
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
                uiSettingsClient: coreContext.uiSettings.client,
              },
              spaceId,
              startedAt: startedAt.toDate(),
              state: statePreview,
              tags: [],
              updatedBy: rule.updatedBy,
            })) as TState;

            const errors = loggedStatusChanges
              .filter((item) => item.newStatus === RuleExecutionStatus.failed)
              .map((item) => item.message ?? 'Unkown Error');

            const warnings = loggedStatusChanges
              .filter((item) => item.newStatus === RuleExecutionStatus['partial failure'])
              .map((item) => item.message ?? 'Unknown Warning');

            logs.push({
              errors,
              warnings,
              startedAt: startedAt.toDate().toISOString(),
              duration: moment().diff(invocationStartTime, 'milliseconds'),
            });

            loggedStatusChanges.length = 0;

            if (errors.length) {
              break;
            }

            previousStartedAt = startedAt.toDate();
            startedAt.add(parseInterval(internalRule.schedule.interval));
            invocationCount--;
          }
        };

        switch (previewRuleParams.type) {
          case 'query':
            const queryAlertType = previewRuleTypeWrapper(
              createQueryAlertType({ ...ruleOptions, ...queryRuleAdditionalOptions })
            );
            await runExecutors(
              queryAlertType.executor,
              queryAlertType.id,
              queryAlertType.name,
              previewRuleParams,
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
            const savedQueryAlertType = previewRuleTypeWrapper(
              createSavedQueryAlertType({ ...ruleOptions, ...queryRuleAdditionalOptions })
            );
            await runExecutors(
              savedQueryAlertType.executor,
              savedQueryAlertType.id,
              savedQueryAlertType.name,
              previewRuleParams,
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
            const thresholdAlertType = previewRuleTypeWrapper(
              createThresholdAlertType(ruleOptions)
            );
            await runExecutors(
              thresholdAlertType.executor,
              thresholdAlertType.id,
              thresholdAlertType.name,
              previewRuleParams,
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
            const threatMatchAlertType = previewRuleTypeWrapper(
              createIndicatorMatchAlertType(ruleOptions)
            );
            await runExecutors(
              threatMatchAlertType.executor,
              threatMatchAlertType.id,
              threatMatchAlertType.name,
              previewRuleParams,
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
            const eqlAlertType = previewRuleTypeWrapper(createEqlAlertType(ruleOptions));
            await runExecutors(
              eqlAlertType.executor,
              eqlAlertType.id,
              eqlAlertType.name,
              previewRuleParams,
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
            const mlAlertType = previewRuleTypeWrapper(createMlAlertType(ruleOptions));
            await runExecutors(
              mlAlertType.executor,
              mlAlertType.id,
              mlAlertType.name,
              previewRuleParams,
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
            const newTermsAlertType = previewRuleTypeWrapper(createNewTermsAlertType(ruleOptions));
            await runExecutors(
              newTermsAlertType.executor,
              newTermsAlertType.id,
              newTermsAlertType.name,
              previewRuleParams,
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
            assertUnreachable(previewRuleParams);
        }

        // Refreshes alias to ensure index is able to be read before returning
        await coreContext.elasticsearch.client.asInternalUser.indices.refresh(
          {
            index: previewRuleDataClient.indexNameWithNamespace(spaceId),
          },
          { ignore: [404] }
        );

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
