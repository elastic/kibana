/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { Dictionary, pickBy, mapValues, without, cloneDeep } from 'lodash';
import type { Request } from '@hapi/hapi';
import { addSpaceIdToPath } from '../../../spaces/server';
import { Logger, KibanaRequest } from '../../../../../src/core/server';
import { TaskRunnerContext } from './task_runner_factory';
import { ConcreteTaskInstance, throwUnrecoverableError } from '../../../task_manager/server';
import { createExecutionHandler, ExecutionHandler } from './create_execution_handler';
import { AlertInstance, createAlertInstanceFactory } from '../alert_instance';
import {
  validateAlertTypeParams,
  executionStatusFromState,
  executionStatusFromError,
  alertExecutionStatusToRaw,
  ErrorWithReason,
  ElasticsearchError,
} from '../lib';
import {
  RawAlert,
  IntervalSchedule,
  Services,
  RawAlertInstance,
  AlertTaskState,
  Alert,
  SanitizedAlert,
  AlertExecutionStatus,
  AlertExecutionStatusErrorReasons,
  RuleTypeRegistry,
} from '../types';
import { promiseResult, map, Resultable, asOk, asErr, resolveErr } from '../lib/result_type';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { IEvent, IEventLogger, SAVED_OBJECT_REL_PRIMARY } from '../../../event_log/server';
import { isAlertSavedObjectNotFoundError } from '../lib/is_alert_not_found_error';
import { RulesClient } from '../rules_client';
import { partiallyUpdateAlert } from '../saved_objects';
import {
  ActionGroup,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  WithoutReservedActionGroups,
} from '../../common';
import { NormalizedAlertType, UntypedNormalizedAlertType } from '../rule_type_registry';
import { getEsErrorMessage } from '../lib/errors';
import {
  createAlertEventLogRecordObject,
  Event,
} from '../lib/create_alert_event_log_record_object';

const FALLBACK_RETRY_INTERVAL = '5m';

// 1,000,000 nanoseconds in 1 millisecond
const Millis2Nanos = 1000 * 1000;

interface AlertTaskRunResult {
  state: AlertTaskState;
  schedule: IntervalSchedule | undefined;
}

interface AlertTaskInstance extends ConcreteTaskInstance {
  state: AlertTaskState;
}

export class TaskRunner<
  Params extends AlertTypeParams,
  ExtractedParams extends AlertTypeParams,
  State extends AlertTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: AlertTaskInstance;
  private alertType: NormalizedAlertType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  private readonly ruleTypeRegistry: RuleTypeRegistry;

  constructor(
    alertType: NormalizedAlertType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >,
    taskInstance: ConcreteTaskInstance,
    context: TaskRunnerContext
  ) {
    this.context = context;
    this.logger = context.logger;
    this.alertType = alertType;
    this.taskInstance = taskInstanceToAlertTaskInstance(taskInstance);
    this.ruleTypeRegistry = context.ruleTypeRegistry;
  }

  async getApiKeyForAlertPermissions(alertId: string, spaceId: string) {
    const namespace = this.context.spaceIdToNamespace(spaceId);
    // Only fetch encrypted attributes here, we'll create a saved objects client
    // scoped with the API key to fetch the remaining data.
    const {
      attributes: { apiKey },
    } = await this.context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAlert>(
      'alert',
      alertId,
      { namespace }
    );

    return apiKey;
  }

  private getFakeKibanaRequest(spaceId: string, apiKey: RawAlert['apiKey']) {
    const requestHeaders: Record<string, string> = {};

    if (apiKey) {
      requestHeaders.authorization = `ApiKey ${apiKey}`;
    }

    const path = addSpaceIdToPath('/', spaceId);

    const fakeRequest = KibanaRequest.from({
      headers: requestHeaders,
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    } as unknown as Request);

    this.context.basePathService.set(fakeRequest, path);

    return fakeRequest;
  }

  private getServicesWithSpaceLevelPermissions(
    spaceId: string,
    apiKey: RawAlert['apiKey']
  ): [Services, PublicMethodsOf<RulesClient>] {
    const request = this.getFakeKibanaRequest(spaceId, apiKey);
    return [this.context.getServices(request), this.context.getRulesClientWithRequest(request)];
  }

  private getExecutionHandler(
    alertId: string,
    alertName: string,
    tags: string[] | undefined,
    spaceId: string,
    apiKey: RawAlert['apiKey'],
    kibanaBaseUrl: string | undefined,
    actions: Alert<Params>['actions'],
    alertParams: Params
  ) {
    return createExecutionHandler<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >({
      alertId,
      alertName,
      tags,
      logger: this.logger,
      actionsPlugin: this.context.actionsPlugin,
      apiKey,
      actions,
      spaceId,
      alertType: this.alertType,
      kibanaBaseUrl,
      eventLogger: this.context.eventLogger,
      request: this.getFakeKibanaRequest(spaceId, apiKey),
      alertParams,
      supportsEphemeralTasks: this.context.supportsEphemeralTasks,
      maxEphemeralActionsPerAlert: this.context.maxEphemeralActionsPerAlert,
    });
  }

  async executeAlertInstance(
    alertInstanceId: string,
    alertInstance: AlertInstance<InstanceState, InstanceContext>,
    executionHandler: ExecutionHandler<ActionGroupIds | RecoveryActionGroupId>
  ) {
    const {
      actionGroup,
      subgroup: actionSubgroup,
      context,
      state,
    } = alertInstance.getScheduledActionOptions()!;
    alertInstance.updateLastScheduledActions(actionGroup, actionSubgroup);
    alertInstance.unscheduleActions();
    return executionHandler({ actionGroup, actionSubgroup, context, state, alertInstanceId });
  }

  async executeAlertInstances(
    services: Services,
    alert: SanitizedAlert<Params>,
    params: Params,
    executionHandler: ExecutionHandler<ActionGroupIds | RecoveryActionGroupId>,
    spaceId: string,
    event: Event
  ): Promise<AlertTaskState> {
    const {
      alertTypeId,
      consumer,
      schedule,
      throttle,
      notifyWhen,
      muteAll,
      mutedInstanceIds,
      name,
      tags,
      createdBy,
      updatedBy,
      createdAt,
      updatedAt,
      enabled,
      actions,
    } = alert;
    const {
      params: { alertId },
      state: { alertInstances: alertRawInstances = {}, alertTypeState = {}, previousStartedAt },
    } = this.taskInstance;
    const namespace = this.context.spaceIdToNamespace(spaceId);
    const alertType = this.ruleTypeRegistry.get(alertTypeId);

    const alertInstances = mapValues<
      Record<string, RawAlertInstance>,
      AlertInstance<InstanceState, InstanceContext>
    >(
      alertRawInstances,
      (rawAlertInstance) => new AlertInstance<InstanceState, InstanceContext>(rawAlertInstance)
    );
    const originalAlertInstances = cloneDeep(alertInstances);
    const originalAlertInstanceIds = new Set(Object.keys(originalAlertInstances));

    const eventLogger = this.context.eventLogger;
    const alertLabel = `${this.alertType.id}:${alertId}: '${name}'`;

    let updatedAlertTypeState: void | Record<string, unknown>;
    try {
      const ctx = {
        type: 'alert',
        name: `execute ${alert.alertTypeId}`,
        id: alertId,
        description: `execute [${alert.alertTypeId}] with name [${name}] in [${
          namespace ?? 'default'
        }] namespace`,
      };

      updatedAlertTypeState = await this.context.executionContext.withContext(ctx, () =>
        this.alertType.executor({
          alertId,
          services: {
            ...services,
            alertInstanceFactory: createAlertInstanceFactory<
              InstanceState,
              InstanceContext,
              WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
            >(alertInstances),
          },
          params,
          state: alertTypeState as State,
          startedAt: this.taskInstance.startedAt!,
          previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
          spaceId,
          namespace,
          name,
          tags,
          createdBy,
          updatedBy,
          rule: {
            name,
            tags,
            consumer,
            producer: alertType.producer,
            ruleTypeId: alert.alertTypeId,
            ruleTypeName: alertType.name,
            enabled,
            schedule,
            actions,
            createdBy,
            updatedBy,
            createdAt,
            updatedAt,
            throttle,
            notifyWhen,
          },
        })
      );
    } catch (err) {
      event.message = `alert execution failure: ${alertLabel}`;
      event.error = event.error || {};
      event.error.message = err.message;
      event.event = event.event || {};
      event.event.outcome = 'failure';
      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.Execute, err);
    }

    event.message = `alert executed: ${alertLabel}`;
    event.event = event.event || {};
    event.event.outcome = 'success';
    event.rule = {
      ...event.rule,
      name: alert.name,
    };

    // Cleanup alert instances that are no longer scheduling actions to avoid over populating the alertInstances object
    const instancesWithScheduledActions = pickBy(
      alertInstances,
      (alertInstance: AlertInstance<InstanceState, InstanceContext>) =>
        alertInstance.hasScheduledActions()
    );
    const recoveredAlertInstances = pickBy(
      alertInstances,
      (alertInstance: AlertInstance<InstanceState, InstanceContext>, id) =>
        !alertInstance.hasScheduledActions() && originalAlertInstanceIds.has(id)
    );

    logActiveAndRecoveredInstances({
      logger: this.logger,
      activeAlertInstances: instancesWithScheduledActions,
      recoveredAlertInstances,
      alertLabel,
    });

    trackAlertDurations({
      originalAlerts: originalAlertInstances,
      currentAlerts: instancesWithScheduledActions,
      recoveredAlerts: recoveredAlertInstances,
    });

    generateNewAndRecoveredInstanceEvents({
      eventLogger,
      originalAlertInstances,
      currentAlertInstances: instancesWithScheduledActions,
      recoveredAlertInstances,
      alertId,
      alertLabel,
      namespace,
      ruleType: alertType,
      rule: alert,
    });

    if (!muteAll) {
      const mutedInstanceIdsSet = new Set(mutedInstanceIds);

      scheduleActionsForRecoveredInstances<InstanceState, InstanceContext, RecoveryActionGroupId>({
        recoveryActionGroup: this.alertType.recoveryActionGroup,
        recoveredAlertInstances,
        executionHandler,
        mutedInstanceIdsSet,
        logger: this.logger,
        alertLabel,
      });

      const instancesToExecute =
        notifyWhen === 'onActionGroupChange'
          ? Object.entries(instancesWithScheduledActions).filter(
              ([alertInstanceName, alertInstance]: [
                string,
                AlertInstance<InstanceState, InstanceContext>
              ]) => {
                const shouldExecuteAction =
                  alertInstance.scheduledActionGroupOrSubgroupHasChanged();
                if (!shouldExecuteAction) {
                  this.logger.debug(
                    `skipping scheduling of actions for '${alertInstanceName}' in alert ${alertLabel}: instance is active but action group has not changed`
                  );
                }
                return shouldExecuteAction;
              }
            )
          : Object.entries(instancesWithScheduledActions).filter(
              ([alertInstanceName, alertInstance]: [
                string,
                AlertInstance<InstanceState, InstanceContext>
              ]) => {
                const throttled = alertInstance.isThrottled(throttle);
                const muted = mutedInstanceIdsSet.has(alertInstanceName);
                const shouldExecuteAction = !throttled && !muted;
                if (!shouldExecuteAction) {
                  this.logger.debug(
                    `skipping scheduling of actions for '${alertInstanceName}' in alert ${alertLabel}: instance is ${
                      muted ? 'muted' : 'throttled'
                    }`
                  );
                }
                return shouldExecuteAction;
              }
            );

      await Promise.all(
        instancesToExecute.map(
          ([id, alertInstance]: [string, AlertInstance<InstanceState, InstanceContext>]) =>
            this.executeAlertInstance(id, alertInstance, executionHandler)
        )
      );
    } else {
      this.logger.debug(`no scheduling of actions for alert ${alertLabel}: alert is muted.`);
    }

    return {
      alertTypeState: updatedAlertTypeState || undefined,
      alertInstances: mapValues<
        Record<string, AlertInstance<InstanceState, InstanceContext>>,
        RawAlertInstance
      >(instancesWithScheduledActions, (alertInstance) => alertInstance.toRaw()),
    };
  }

  async validateAndExecuteAlert(
    services: Services,
    apiKey: RawAlert['apiKey'],
    alert: SanitizedAlert<Params>,
    event: Event
  ) {
    const {
      params: { alertId, spaceId },
    } = this.taskInstance;

    // Validate
    const validatedParams = validateAlertTypeParams(alert.params, this.alertType.validate?.params);
    const executionHandler = this.getExecutionHandler(
      alertId,
      alert.name,
      alert.tags,
      spaceId,
      apiKey,
      this.context.kibanaBaseUrl,
      alert.actions,
      alert.params
    );
    return this.executeAlertInstances(
      services,
      alert,
      validatedParams,
      executionHandler,
      spaceId,
      event
    );
  }

  async loadAlertAttributesAndRun(event: Event): Promise<Resultable<AlertTaskRunResult, Error>> {
    const {
      params: { alertId, spaceId },
    } = this.taskInstance;
    let apiKey: string | null;
    try {
      apiKey = await this.getApiKeyForAlertPermissions(alertId, spaceId);
    } catch (err) {
      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.Decrypt, err);
    }
    const [services, rulesClient] = this.getServicesWithSpaceLevelPermissions(spaceId, apiKey);

    let alert: SanitizedAlert<Params>;

    // Ensure API key is still valid and user has access
    try {
      alert = await rulesClient.get({ id: alertId });

      if (apm.currentTransaction) {
        apm.currentTransaction.name = `Execute Alerting Rule: "${alert.name}"`;
        apm.currentTransaction.addLabels({
          alerting_rule_consumer: alert.consumer,
          alerting_rule_name: alert.name,
          alerting_rule_tags: alert.tags.join(', '),
          alerting_rule_type_id: alert.alertTypeId,
          alerting_rule_params: JSON.stringify(alert.params),
        });
      }
    } catch (err) {
      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.Read, err);
    }

    try {
      this.ruleTypeRegistry.ensureRuleTypeEnabled(alert.alertTypeId);
    } catch (err) {
      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.License, err);
    }
    return {
      state: await promiseResult<AlertTaskState, Error>(
        this.validateAndExecuteAlert(services, apiKey, alert, event)
      ),
      schedule: asOk(
        // fetch the alert again to ensure we return the correct schedule as it may have
        // cahnged during the task execution
        (await rulesClient.get({ id: alertId })).schedule
      ),
    };
  }

  async run(): Promise<AlertTaskRunResult> {
    const {
      params: { alertId, spaceId },
      startedAt,
      state: originalState,
      schedule: taskSchedule,
    } = this.taskInstance;

    if (apm.currentTransaction) {
      apm.currentTransaction.name = `Execute Alerting Rule`;
      apm.currentTransaction.addLabels({
        alerting_rule_id: alertId,
      });
    }

    const runDate = new Date();
    const runDateString = runDate.toISOString();
    this.logger.debug(`executing alert ${this.alertType.id}:${alertId} at ${runDateString}`);

    const namespace = this.context.spaceIdToNamespace(spaceId);
    const eventLogger = this.context.eventLogger;
    const scheduleDelay = runDate.getTime() - this.taskInstance.runAt.getTime();

    const event = createAlertEventLogRecordObject({
      timestamp: runDateString,
      ruleId: alertId,
      ruleType: this.alertType as UntypedNormalizedAlertType,
      action: EVENT_LOG_ACTIONS.execute,
      namespace,
      task: {
        scheduled: this.taskInstance.runAt.toISOString(),
        scheduleDelay: Millis2Nanos * scheduleDelay,
      },
      savedObjects: [
        {
          id: alertId,
          type: 'alert',
          typeId: this.alertType.id,
          relation: SAVED_OBJECT_REL_PRIMARY,
        },
      ],
    });

    eventLogger.startTiming(event);

    const startEvent = cloneDeep({
      ...event,
      event: {
        ...event.event,
        action: EVENT_LOG_ACTIONS.executeStart,
      },
      message: `alert execution start: "${alertId}"`,
    });
    eventLogger.logEvent(startEvent);

    const { state, schedule } = await errorAsAlertTaskRunResult(
      this.loadAlertAttributesAndRun(event)
    );

    const executionStatus: AlertExecutionStatus = map(
      state,
      (alertTaskState: AlertTaskState) => executionStatusFromState(alertTaskState),
      (err: ElasticsearchError) => executionStatusFromError(err)
    );

    // set the executionStatus date to same as event, if it's set
    if (event.event?.start) {
      executionStatus.lastExecutionDate = new Date(event.event.start);
    }

    if (apm.currentTransaction) {
      if (executionStatus.status === 'ok' || executionStatus.status === 'active') {
        apm.currentTransaction.setOutcome('success');
      } else if (executionStatus.status === 'error' || executionStatus.status === 'unknown') {
        apm.currentTransaction.setOutcome('failure');
      }
    }

    this.logger.debug(
      `alertExecutionStatus for ${this.alertType.id}:${alertId}: ${JSON.stringify(executionStatus)}`
    );

    eventLogger.stopTiming(event);
    event.kibana = event.kibana || {};
    event.kibana.alerting = event.kibana.alerting || {};
    event.kibana.alerting.status = executionStatus.status;

    // Copy duration into execution status if available
    if (null != event.event?.duration) {
      executionStatus.lastDuration = Math.round(event.event?.duration / Millis2Nanos);
    }

    // if executionStatus indicates an error, fill in fields in
    // event from it
    if (executionStatus.error) {
      event.event = event.event || {};
      event.event.reason = executionStatus.error?.reason || 'unknown';
      event.event.outcome = 'failure';
      event.error = event.error || {};
      event.error.message = event.error.message || executionStatus.error.message;
      if (!event.message) {
        event.message = `${this.alertType.id}:${alertId}: execution failed`;
      }
    }

    eventLogger.logEvent(event);

    const client = this.context.internalSavedObjectsRepository;
    const attributes = {
      executionStatus: alertExecutionStatusToRaw(executionStatus),
    };

    try {
      await partiallyUpdateAlert(client, alertId, attributes, {
        ignore404: true,
        namespace,
        refresh: false,
      });
    } catch (err) {
      this.logger.error(
        `error updating alert execution status for ${this.alertType.id}:${alertId} ${err.message}`
      );
    }

    return {
      state: map<AlertTaskState, ElasticsearchError, AlertTaskState>(
        state,
        (stateUpdates: AlertTaskState) => {
          return {
            ...stateUpdates,
            previousStartedAt: startedAt,
          };
        },
        (err: ElasticsearchError) => {
          const message = `Executing Alert ${spaceId}:${
            this.alertType.id
          }:${alertId} has resulted in Error: ${getEsErrorMessage(err)}`;
          if (isAlertSavedObjectNotFoundError(err, alertId)) {
            this.logger.debug(message);
          } else {
            this.logger.error(message);
          }
          return originalState;
        }
      ),
      schedule: resolveErr<IntervalSchedule | undefined, Error>(schedule, (error) => {
        if (isAlertSavedObjectNotFoundError(error, alertId)) {
          const spaceMessage = spaceId ? `in the "${spaceId}" space ` : '';
          this.logger.warn(
            `Unable to execute rule "${alertId}" ${spaceMessage}because ${error.message} - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
          );
          throwUnrecoverableError(error);
        }
        return { interval: taskSchedule?.interval ?? FALLBACK_RETRY_INTERVAL };
      }),
    };
  }
}

interface TrackAlertDurationsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  originalAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  currentAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  recoveredAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
}

function trackAlertDurations<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
>(params: TrackAlertDurationsParams<InstanceState, InstanceContext>) {
  const currentTime = new Date().toISOString();
  const { currentAlerts, originalAlerts, recoveredAlerts } = params;
  const originalAlertIds = Object.keys(originalAlerts);
  const currentAlertIds = Object.keys(currentAlerts);
  const recoveredAlertIds = Object.keys(recoveredAlerts);
  const newAlertIds = without(currentAlertIds, ...originalAlertIds);

  // Inject start time into instance state of new instances
  for (const id of newAlertIds) {
    const state = currentAlerts[id].getState();
    currentAlerts[id].replaceState({ ...state, start: currentTime });
  }

  // Calculate duration to date for active instances
  for (const id of currentAlertIds) {
    const state = originalAlertIds.includes(id)
      ? originalAlerts[id].getState()
      : currentAlerts[id].getState();
    const duration = state.start
      ? (new Date(currentTime).valueOf() - new Date(state.start as string).valueOf()) * 1000 * 1000 // nanoseconds
      : undefined;
    currentAlerts[id].replaceState({
      ...state,
      ...(state.start ? { start: state.start } : {}),
      ...(duration !== undefined ? { duration } : {}),
    });
  }

  // Inject end time into instance state of recovered instances
  for (const id of recoveredAlertIds) {
    const state = recoveredAlerts[id].getState();
    const duration = state.start
      ? (new Date(currentTime).valueOf() - new Date(state.start as string).valueOf()) * 1000 * 1000 // nanoseconds
      : undefined;
    recoveredAlerts[id].replaceState({
      ...state,
      ...(duration ? { duration } : {}),
      ...(state.start ? { end: currentTime } : {}),
    });
  }
}

interface GenerateNewAndRecoveredInstanceEventsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  eventLogger: IEventLogger;
  originalAlertInstances: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  currentAlertInstances: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  recoveredAlertInstances: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  alertId: string;
  alertLabel: string;
  namespace: string | undefined;
  ruleType: NormalizedAlertType<
    AlertTypeParams,
    AlertTypeParams,
    AlertTypeState,
    {
      [x: string]: unknown;
    },
    {
      [x: string]: unknown;
    },
    string,
    string
  >;
  rule: SanitizedAlert<AlertTypeParams>;
}

function generateNewAndRecoveredInstanceEvents<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
>(params: GenerateNewAndRecoveredInstanceEventsParams<InstanceState, InstanceContext>) {
  const {
    eventLogger,
    alertId,
    namespace,
    currentAlertInstances,
    originalAlertInstances,
    recoveredAlertInstances,
    rule,
    ruleType,
  } = params;
  const originalAlertInstanceIds = Object.keys(originalAlertInstances);
  const currentAlertInstanceIds = Object.keys(currentAlertInstances);
  const recoveredAlertInstanceIds = Object.keys(recoveredAlertInstances);
  const newIds = without(currentAlertInstanceIds, ...originalAlertInstanceIds);

  if (apm.currentTransaction) {
    apm.currentTransaction.addLabels({
      alerting_new_alerts: newIds.length,
    });
  }

  for (const id of recoveredAlertInstanceIds) {
    const { group: actionGroup, subgroup: actionSubgroup } =
      recoveredAlertInstances[id].getLastScheduledActions() ?? {};
    const state = recoveredAlertInstances[id].getState();
    const message = `${params.alertLabel} instance '${id}' has recovered`;
    logInstanceEvent(
      id,
      EVENT_LOG_ACTIONS.recoveredInstance,
      message,
      state,
      actionGroup,
      actionSubgroup
    );
  }

  for (const id of newIds) {
    const { actionGroup, subgroup: actionSubgroup } =
      currentAlertInstances[id].getScheduledActionOptions() ?? {};
    const state = currentAlertInstances[id].getState();
    const message = `${params.alertLabel} created new instance: '${id}'`;
    logInstanceEvent(
      id,
      EVENT_LOG_ACTIONS.newInstance,
      message,
      state,
      actionGroup,
      actionSubgroup
    );
  }

  for (const id of currentAlertInstanceIds) {
    const { actionGroup, subgroup: actionSubgroup } =
      currentAlertInstances[id].getScheduledActionOptions() ?? {};
    const state = currentAlertInstances[id].getState();
    const message = `${params.alertLabel} active instance: '${id}' in ${
      actionSubgroup
        ? `actionGroup(subgroup): '${actionGroup}(${actionSubgroup})'`
        : `actionGroup: '${actionGroup}'`
    }`;
    logInstanceEvent(
      id,
      EVENT_LOG_ACTIONS.activeInstance,
      message,
      state,
      actionGroup,
      actionSubgroup
    );
  }

  function logInstanceEvent(
    instanceId: string,
    action: string,
    message: string,
    state: InstanceState,
    group?: string,
    subgroup?: string
  ) {
    const event: IEvent = {
      event: {
        action,
        kind: 'alert',
        category: [ruleType.producer],
        ...(state?.start ? { start: state.start as string } : {}),
        ...(state?.end ? { end: state.end as string } : {}),
        ...(state?.duration !== undefined ? { duration: state.duration as number } : {}),
      },
      kibana: {
        alerting: {
          instance_id: instanceId,
          ...(group ? { action_group_id: group } : {}),
          ...(subgroup ? { action_subgroup: subgroup } : {}),
        },
        saved_objects: [
          {
            rel: SAVED_OBJECT_REL_PRIMARY,
            type: 'alert',
            id: alertId,
            type_id: ruleType.id,
            namespace,
          },
        ],
      },
      message,
      rule: {
        id: rule.id,
        license: ruleType.minimumLicenseRequired,
        category: ruleType.id,
        ruleset: ruleType.producer,
        name: rule.name,
      },
    };
    eventLogger.logEvent(event);
  }
}

interface ScheduleActionsForRecoveredInstancesParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
  recoveredAlertInstances: Dictionary<
    AlertInstance<InstanceState, InstanceContext, RecoveryActionGroupId>
  >;
  executionHandler: ExecutionHandler<RecoveryActionGroupId | RecoveryActionGroupId>;
  mutedInstanceIdsSet: Set<string>;
  alertLabel: string;
}

function scheduleActionsForRecoveredInstances<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
>(
  params: ScheduleActionsForRecoveredInstancesParams<
    InstanceState,
    InstanceContext,
    RecoveryActionGroupId
  >
) {
  const {
    logger,
    recoveryActionGroup,
    recoveredAlertInstances,
    executionHandler,
    mutedInstanceIdsSet,
    alertLabel,
  } = params;
  const recoveredIds = Object.keys(recoveredAlertInstances);
  for (const id of recoveredIds) {
    if (mutedInstanceIdsSet.has(id)) {
      logger.debug(
        `skipping scheduling of actions for '${id}' in alert ${alertLabel}: instance is muted`
      );
    } else {
      const instance = recoveredAlertInstances[id];
      instance.updateLastScheduledActions(recoveryActionGroup.id);
      instance.unscheduleActions();
      executionHandler({
        actionGroup: recoveryActionGroup.id,
        context: {},
        state: {},
        alertInstanceId: id,
      });
      instance.scheduleActions(recoveryActionGroup.id);
    }
  }
}

interface LogActiveAndRecoveredInstancesParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  activeAlertInstances: Dictionary<AlertInstance<InstanceState, InstanceContext, ActionGroupIds>>;
  recoveredAlertInstances: Dictionary<
    AlertInstance<InstanceState, InstanceContext, RecoveryActionGroupId>
  >;
  alertLabel: string;
}

function logActiveAndRecoveredInstances<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  params: LogActiveAndRecoveredInstancesParams<
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >
) {
  const { logger, activeAlertInstances, recoveredAlertInstances, alertLabel } = params;
  const activeInstanceIds = Object.keys(activeAlertInstances);
  const recoveredInstanceIds = Object.keys(recoveredAlertInstances);

  if (apm.currentTransaction) {
    apm.currentTransaction.addLabels({
      alerting_active_alerts: activeInstanceIds.length,
      alerting_recovered_alerts: recoveredInstanceIds.length,
    });
  }

  if (activeInstanceIds.length > 0) {
    logger.debug(
      `alert ${alertLabel} has ${activeInstanceIds.length} active alert instances: ${JSON.stringify(
        activeInstanceIds.map((instanceId) => ({
          instanceId,
          actionGroup: activeAlertInstances[instanceId].getScheduledActionOptions()?.actionGroup,
        }))
      )}`
    );
  }
  if (recoveredInstanceIds.length > 0) {
    logger.debug(
      `alert ${alertLabel} has ${
        recoveredInstanceIds.length
      } recovered alert instances: ${JSON.stringify(recoveredInstanceIds)}`
    );
  }
}

/**
 * If an error is thrown, wrap it in an AlertTaskRunResult
 * so that we can treat each field independantly
 */
async function errorAsAlertTaskRunResult(
  future: Promise<Resultable<AlertTaskRunResult, Error>>
): Promise<Resultable<AlertTaskRunResult, Error>> {
  try {
    return await future;
  } catch (e) {
    return {
      state: asErr(e),
      schedule: asErr(e),
    };
  }
}
