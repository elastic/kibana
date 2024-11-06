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
import type { Logger, StartServicesAccessor, IKibanaResponse } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAction,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { parseDuration, DISABLE_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import type { ExecutorType } from '@kbn/alerting-plugin/server/types';
import type { Alert } from '@kbn/alerting-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  DEFAULT_PREVIEW_INDEX,
  DETECTION_ENGINE_RULES_PREVIEW,
  SERVER_APP_ID,
} from '../../../../../../common/constants';
import { validateCreateRuleProps } from '../../../../../../common/api/detection_engine/rule_management';
import { RuleExecutionStatusEnum } from '../../../../../../common/api/detection_engine/rule_monitoring';
import type {
  RulePreviewResponse,
  RulePreviewLogs,
} from '../../../../../../common/api/detection_engine';
import {
  RulePreviewRequestBody,
  RulePreviewRequestQuery,
} from '../../../../../../common/api/detection_engine';
import type { RulePreviewLoggedRequest } from '../../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';

import type { StartPlugins, SetupPlugins } from '../../../../../plugin';
import { buildSiemResponse } from '../../../routes/utils';
import type { RuleParams } from '../../../rule_schema';
import { createPreviewRuleExecutionLogger } from './preview_rule_execution_logger';
import { parseInterval } from '../../../rule_types/utils/utils';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import type { RuleExecutionContext, StatusChangeArgs } from '../../../rule_monitoring';

import type { ConfigType } from '../../../../../config';
import { alertInstanceFactoryStub } from './alert_instance_factory_stub';
import type {
  CreateRuleOptions,
  CreateSecurityRuleTypeWrapperProps,
} from '../../../rule_types/types';
import {
  createEqlAlertType,
  createEsqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createQueryAlertType,
  createThresholdAlertType,
  createNewTermsAlertType,
} from '../../../rule_types';
import { createSecurityRuleTypeWrapper } from '../../../rule_types/create_security_rule_type_wrapper';
import { assertUnreachable } from '../../../../../../common/utility_types';
import { wrapScopedClusterClient } from './wrap_scoped_cluster_client';
import { wrapSearchSourceClient } from './wrap_search_source_client';
import { applyRuleDefaults } from '../../../rule_management/logic/detection_rules_client/mergers/apply_rule_defaults';
import { convertRuleResponseToAlertingRule } from '../../../rule_management/logic/detection_rules_client/converters/convert_rule_response_to_alerting_rule';

const PREVIEW_TIMEOUT_SECONDS = 60;
const MAX_ROUTE_CONCURRENCY = 10;

export const previewRulesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  security: SetupPlugins['security'],
  ruleOptions: CreateRuleOptions,
  securityRuleTypeOptions: CreateSecurityRuleTypeWrapperProps,
  previewRuleDataClient: IRuleDataClient,
  getStartServices: StartServicesAccessor<StartPlugins>,
  logger: Logger
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_RULES_PREVIEW,
      access: 'public',
      options: {
        tags: ['access:securitySolution', routeLimitedConcurrencyTag(MAX_ROUTE_CONCURRENCY)],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(RulePreviewRequestBody),
            query: buildRouteValidationWithZod(RulePreviewRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<RulePreviewResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateCreateRuleProps(request.body);
        const coreContext = await context.core;
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }
        try {
          const [, { data, security: securityService, share, dataViews }] =
            await getStartServices();
          const searchSourceClient = await data.search.searchSource.asScoped(request);
          const savedObjectsClient = coreContext.savedObjects.client;
          const siemClient = (await context.securitySolution).getAppClient();
          const actionsClient = (await context.actions).getActionsClient();

          const timeframeEnd = request.body.timeframeEnd;
          let invocationCount = request.body.invocationCount;
          if (invocationCount < 1) {
            return response.ok({
              body: {
                logs: [{ errors: ['Invalid invocation count'], warnings: [], duration: 0 }],
                previewId: undefined,
                isAborted: undefined,
              },
            });
          }

          const internalRule = convertRuleResponseToAlertingRule(
            applyRuleDefaults(request.body),
            actionsClient
          );
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
          const previewId = uuidv4();
          const username = security?.authc.getCurrentUser(request)?.username;
          const loggedStatusChanges: Array<RuleExecutionContext & StatusChangeArgs> = [];
          const previewRuleExecutionLogger = createPreviewRuleExecutionLogger(loggedStatusChanges);
          const runState: Record<string, unknown> = {
            isLoggedRequestsEnabled: request.query.enable_logged_requests,
          };
          const logs: RulePreviewLogs[] = [];
          let isAborted = false;

          const { hasAllRequested } = await securityService.authz
            .checkPrivilegesWithRequest(request)
            .atSpace(spaceId, {
              elasticsearch: {
                index: {
                  [`${DEFAULT_PREVIEW_INDEX}-${spaceId}`]: ['read'],
                  [`.internal${DEFAULT_PREVIEW_INDEX}-${spaceId}-*`]: ['read'],
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
                previewId: undefined,
                isAborted: undefined,
              },
            });
          }

          const previewRuleTypeWrapper = createSecurityRuleTypeWrapper({
            ...securityRuleTypeOptions,
            ruleDataClient: previewRuleDataClient,
            ruleExecutionLoggerFactory: previewRuleExecutionLogger.factory,
            isPreview: true,
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
                | 'getStart'
              >;
              alertLimit: {
                getValue: () => number;
                setLimitReached: () => void;
              };
              done: () => { getRecoveredAlerts: () => [] };
            }
          ) => {
            let statePreview = runState as TState;
            let loggedRequests = [];

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
              id: previewId,
              createdAt: new Date(),
              createdBy: username ?? 'preview-created-by',
              producer: 'preview-producer',
              consumer: SERVER_APP_ID,
              enabled: true,
              revision: 0,
              ruleTypeId,
              ruleTypeName,
              updatedAt: new Date(),
              updatedBy: username ?? 'preview-updated-by',
              muteAll: false,
              snoozeSchedule: [],
              // In Security Solution, action params are typed as Record<string,
              // unknown>, which is a correct type for action params, but we
              // need to cast here to comply with the alerting types
              actions: internalRule.actions as RuleAction[],
            };

            let invocationStartTime;

            const dataViewsService = await dataViews.dataViewsServiceFactory(
              savedObjectsClient,
              coreContext.elasticsearch.client.asInternalUser
            );

            while (invocationCount > 0 && !isAborted) {
              invocationStartTime = moment();

              ({ state: statePreview, loggedRequests } = (await executor({
                executionId: uuidv4(),
                params,
                previousStartedAt,
                rule,
                services: {
                  shouldWriteAlerts,
                  shouldStopExecution: () => false,
                  alertsClient: null,
                  alertFactory,
                  savedObjectsClient: coreContext.savedObjects.client,
                  scopedClusterClient: wrapScopedClusterClient({
                    abortController,
                    scopedClusterClient: coreContext.elasticsearch.client,
                  }),
                  getSearchSourceClient: async () =>
                    wrapSearchSourceClient({
                      abortController,
                      searchSourceClient,
                    }),
                  getMaintenanceWindowIds: async () => [],
                  uiSettingsClient: coreContext.uiSettings.client,
                  getDataViews: async () => dataViewsService,
                  share,
                },
                spaceId,
                startedAt: startedAt.toDate(),
                startedAtOverridden: true,
                state: statePreview,
                logger,
                flappingSettings: DISABLE_FLAPPING_SETTINGS,
                getTimeRange: () => {
                  const date = startedAt.toISOString();
                  return { dateStart: date, dateEnd: date };
                },
              })) as { state: TState; loggedRequests: RulePreviewLoggedRequest[] });

              const errors = loggedStatusChanges
                .filter((item) => item.newStatus === RuleExecutionStatusEnum.failed)
                .map((item) => item.message ?? 'Unknown Error');

              const warnings = loggedStatusChanges
                .filter((item) => item.newStatus === RuleExecutionStatusEnum['partial failure'])
                .map((item) => item.message ?? 'Unknown Warning');

              logs.push({
                errors,
                warnings,
                startedAt: startedAt.toDate().toISOString(),
                duration: moment().diff(invocationStartTime, 'milliseconds'),
                ...(loggedRequests ? { requests: loggedRequests } : {}),
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
            case 'esql':
              if (config.experimentalFeatures.esqlRulesDisabled) {
                throw Error('ES|QL rule type is not supported');
              }
              const esqlAlertType = previewRuleTypeWrapper(createEsqlAlertType(ruleOptions));
              await runExecutors(
                esqlAlertType.executor,
                esqlAlertType.id,
                esqlAlertType.name,
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
              const newTermsAlertType = previewRuleTypeWrapper(
                createNewTermsAlertType(ruleOptions)
              );
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
