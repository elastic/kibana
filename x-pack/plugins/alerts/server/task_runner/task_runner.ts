/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { Dictionary, pickBy, mapValues, without, cloneDeep } from 'lodash';
import type { Request } from '@hapi/hapi';
import { addSpaceIdToPath } from '../../../spaces/server';
import { Logger, KibanaRequest } from '../../../../../src/core/server';
import { TaskRunnerContext } from './task_runner_factory';
import { ConcreteTaskInstance, throwUnrecoverableError } from '../../../task_manager/server';
import { createExecutionHandler } from './create_execution_handler';
import { AlertInstance, createAlertInstanceFactory } from '../alert_instance';
import {
  validateAlertTypeParams,
  executionStatusFromState,
  executionStatusFromError,
  alertExecutionStatusToRaw,
  ErrorWithReason,
} from '../lib';
import {
  RawAlert,
  IntervalSchedule,
  Services,
  RawAlertInstance,
  AlertTaskState,
  Alert,
  AlertExecutorOptions,
  SanitizedAlert,
  AlertExecutionStatus,
  AlertExecutionStatusErrorReasons,
} from '../types';
import { promiseResult, map, Resultable, asOk, asErr, resolveErr } from '../lib/result_type';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { IEvent, IEventLogger, SAVED_OBJECT_REL_PRIMARY } from '../../../event_log/server';
import { isAlertSavedObjectNotFoundError } from '../lib/is_alert_not_found_error';
import { AlertsClient } from '../alerts_client';
import { partiallyUpdateAlert } from '../saved_objects';
import { ActionGroup } from '../../common';
import { NormalizedAlertType } from '../alert_type_registry';

const FALLBACK_RETRY_INTERVAL = '5m';

type Event = Exclude<IEvent, undefined>;

interface AlertTaskRunResult {
  state: AlertTaskState;
  schedule: IntervalSchedule | undefined;
}

interface AlertTaskInstance extends ConcreteTaskInstance {
  state: AlertTaskState;
}

export class TaskRunner {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: AlertTaskInstance;
  private alertType: NormalizedAlertType;

  constructor(
    alertType: NormalizedAlertType,
    taskInstance: ConcreteTaskInstance,
    context: TaskRunnerContext
  ) {
    this.context = context;
    this.logger = context.logger;
    this.alertType = alertType;
    this.taskInstance = taskInstanceToAlertTaskInstance(taskInstance);
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

    const fakeRequest = KibanaRequest.from(({
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
    } as unknown) as Request);

    this.context.basePathService.set(fakeRequest, path);

    return fakeRequest;
  }

  private getServicesWithSpaceLevelPermissions(
    spaceId: string,
    apiKey: RawAlert['apiKey']
  ): [Services, PublicMethodsOf<AlertsClient>] {
    const request = this.getFakeKibanaRequest(spaceId, apiKey);
    return [this.context.getServices(request), this.context.getAlertsClientWithRequest(request)];
  }

  private getExecutionHandler(
    alertId: string,
    alertName: string,
    tags: string[] | undefined,
    spaceId: string,
    apiKey: RawAlert['apiKey'],
    actions: Alert['actions'],
    alertParams: RawAlert['params']
  ) {
    return createExecutionHandler({
      alertId,
      alertName,
      tags,
      logger: this.logger,
      actionsPlugin: this.context.actionsPlugin,
      apiKey,
      actions,
      spaceId,
      alertType: this.alertType,
      eventLogger: this.context.eventLogger,
      request: this.getFakeKibanaRequest(spaceId, apiKey),
      alertParams,
    });
  }

  async executeAlertInstance(
    alertInstanceId: string,
    alertInstance: AlertInstance,
    executionHandler: ReturnType<typeof createExecutionHandler>
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
    alert: SanitizedAlert,
    params: AlertExecutorOptions['params'],
    executionHandler: ReturnType<typeof createExecutionHandler>,
    spaceId: string,
    event: Event
  ): Promise<AlertTaskState> {
    const { throttle, muteAll, mutedInstanceIds, name, tags, createdBy, updatedBy } = alert;
    const {
      params: { alertId },
      state: { alertInstances: alertRawInstances = {}, alertTypeState = {}, previousStartedAt },
    } = this.taskInstance;
    const namespace = this.context.spaceIdToNamespace(spaceId);

    const alertInstances = mapValues<Record<string, RawAlertInstance>, AlertInstance>(
      alertRawInstances,
      (rawAlertInstance) => new AlertInstance(rawAlertInstance)
    );
    const originalAlertInstances = cloneDeep(alertInstances);

    const eventLogger = this.context.eventLogger;
    const alertLabel = `${this.alertType.id}:${alertId}: '${name}'`;

    let updatedAlertTypeState: void | Record<string, unknown>;
    try {
      updatedAlertTypeState = await this.alertType.executor({
        alertId,
        services: {
          ...services,
          alertInstanceFactory: createAlertInstanceFactory(alertInstances),
        },
        params,
        state: alertTypeState,
        startedAt: this.taskInstance.startedAt!,
        previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
        spaceId,
        namespace,
        name,
        tags,
        createdBy,
        updatedBy,
      });
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

    // Cleanup alert instances that are no longer scheduling actions to avoid over populating the alertInstances object
    const instancesWithScheduledActions = pickBy(alertInstances, (alertInstance: AlertInstance) =>
      alertInstance.hasScheduledActions()
    );
    const recoveredAlertInstances = pickBy(
      alertInstances,
      (alertInstance: AlertInstance) => !alertInstance.hasScheduledActions()
    );

    logActiveAndRecoveredInstances({
      logger: this.logger,
      activeAlertInstances: instancesWithScheduledActions,
      recoveredAlertInstances,
      alertLabel,
    });

    generateNewAndRecoveredInstanceEvents({
      eventLogger,
      originalAlertInstances,
      currentAlertInstances: instancesWithScheduledActions,
      recoveredAlertInstances,
      alertId,
      alertLabel,
      namespace,
    });

    if (!muteAll) {
      const mutedInstanceIdsSet = new Set(mutedInstanceIds);

      scheduleActionsForRecoveredInstances({
        recoveryActionGroup: this.alertType.recoveryActionGroup,
        recoveredAlertInstances,
        executionHandler,
        mutedInstanceIdsSet,
        logger: this.logger,
        alertLabel,
      });

      await Promise.all(
        Object.entries(instancesWithScheduledActions)
          .filter(([alertInstanceName, alertInstance]: [string, AlertInstance]) => {
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
          })
          .map(([id, alertInstance]: [string, AlertInstance]) =>
            this.executeAlertInstance(id, alertInstance, executionHandler)
          )
      );
    } else {
      this.logger.debug(`no scheduling of actions for alert ${alertLabel}: alert is muted.`);
    }

    return {
      alertTypeState: updatedAlertTypeState || undefined,
      alertInstances: mapValues<Record<string, AlertInstance>, RawAlertInstance>(
        instancesWithScheduledActions,
        (alertInstance) => alertInstance.toRaw()
      ),
    };
  }

  async validateAndExecuteAlert(
    services: Services,
    apiKey: RawAlert['apiKey'],
    alert: SanitizedAlert,
    event: Event
  ) {
    const {
      params: { alertId, spaceId },
    } = this.taskInstance;

    // Validate
    const validatedParams = validateAlertTypeParams(this.alertType, alert.params);
    const executionHandler = this.getExecutionHandler(
      alertId,
      alert.name,
      alert.tags,
      spaceId,
      apiKey,
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
    const [services, alertsClient] = this.getServicesWithSpaceLevelPermissions(spaceId, apiKey);

    let alert: SanitizedAlert;

    // Ensure API key is still valid and user has access
    try {
      alert = await alertsClient.get({ id: alertId });
    } catch (err) {
      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.Read, err);
    }

    return {
      state: await promiseResult<AlertTaskState, Error>(
        this.validateAndExecuteAlert(services, apiKey, alert, event)
      ),
      schedule: asOk(
        // fetch the alert again to ensure we return the correct schedule as it may have
        // cahnged during the task execution
        (await alertsClient.get({ id: alertId })).schedule
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

    const runDate = new Date().toISOString();
    this.logger.debug(`executing alert ${this.alertType.id}:${alertId} at ${runDate}`);

    const namespace = this.context.spaceIdToNamespace(spaceId);
    const eventLogger = this.context.eventLogger;
    const event: IEvent = {
      // explicitly set execute timestamp so it will be before other events
      // generated here (new-instance, schedule-action, etc)
      '@timestamp': runDate,
      event: { action: EVENT_LOG_ACTIONS.execute },
      kibana: {
        saved_objects: [
          {
            rel: SAVED_OBJECT_REL_PRIMARY,
            type: 'alert',
            id: alertId,
            namespace,
          },
        ],
      },
    };
    eventLogger.startTiming(event);

    const { state, schedule } = await errorAsAlertTaskRunResult(
      this.loadAlertAttributesAndRun(event)
    );

    const executionStatus: AlertExecutionStatus = map(
      state,
      (alertTaskState: AlertTaskState) => executionStatusFromState(alertTaskState),
      (err: Error) => executionStatusFromError(err)
    );

    // set the executionStatus date to same as event, if it's set
    if (event.event?.start) {
      executionStatus.lastExecutionDate = new Date(event.event.start);
    }

    this.logger.debug(
      `alertExecutionStatus for ${this.alertType.id}:${alertId}: ${JSON.stringify(executionStatus)}`
    );

    eventLogger.stopTiming(event);
    event.kibana = event.kibana || {};
    event.kibana.alerting = event.kibana.alerting || {};
    event.kibana.alerting.status = executionStatus.status;

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
      });
    } catch (err) {
      this.logger.error(
        `error updating alert execution status for ${this.alertType.id}:${alertId} ${err.message}`
      );
    }

    return {
      state: map<AlertTaskState, Error, AlertTaskState>(
        state,
        (stateUpdates: AlertTaskState) => {
          return {
            ...stateUpdates,
            previousStartedAt: startedAt,
          };
        },
        (err: Error) => {
          const message = `Executing Alert "${alertId}" has resulted in Error: ${err.message}`;
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
          throwUnrecoverableError(error);
        }
        return { interval: taskSchedule?.interval ?? FALLBACK_RETRY_INTERVAL };
      }),
    };
  }
}

interface GenerateNewAndRecoveredInstanceEventsParams {
  eventLogger: IEventLogger;
  originalAlertInstances: Dictionary<AlertInstance>;
  currentAlertInstances: Dictionary<AlertInstance>;
  recoveredAlertInstances: Dictionary<AlertInstance>;
  alertId: string;
  alertLabel: string;
  namespace: string | undefined;
}

function generateNewAndRecoveredInstanceEvents(
  params: GenerateNewAndRecoveredInstanceEventsParams
) {
  const {
    eventLogger,
    alertId,
    namespace,
    currentAlertInstances,
    originalAlertInstances,
    recoveredAlertInstances,
  } = params;
  const originalAlertInstanceIds = Object.keys(originalAlertInstances);
  const currentAlertInstanceIds = Object.keys(currentAlertInstances);
  const recoveredAlertInstanceIds = Object.keys(recoveredAlertInstances);
  const newIds = without(currentAlertInstanceIds, ...originalAlertInstanceIds);

  for (const id of recoveredAlertInstanceIds) {
    const { group: actionGroup, subgroup: actionSubgroup } =
      recoveredAlertInstances[id].getLastScheduledActions() ?? {};
    const message = `${params.alertLabel} instance '${id}' has recovered`;
    logInstanceEvent(id, EVENT_LOG_ACTIONS.recoveredInstance, message, actionGroup, actionSubgroup);
  }

  for (const id of newIds) {
    const { actionGroup, subgroup: actionSubgroup } =
      currentAlertInstances[id].getScheduledActionOptions() ?? {};
    const message = `${params.alertLabel} created new instance: '${id}'`;
    logInstanceEvent(id, EVENT_LOG_ACTIONS.newInstance, message, actionGroup, actionSubgroup);
  }

  for (const id of currentAlertInstanceIds) {
    const { actionGroup, subgroup: actionSubgroup } =
      currentAlertInstances[id].getScheduledActionOptions() ?? {};
    const message = `${params.alertLabel} active instance: '${id}' in ${
      actionSubgroup
        ? `actionGroup(subgroup): '${actionGroup}(${actionSubgroup})'`
        : `actionGroup: '${actionGroup}'`
    }`;
    logInstanceEvent(id, EVENT_LOG_ACTIONS.activeInstance, message, actionGroup, actionSubgroup);
  }

  function logInstanceEvent(
    instanceId: string,
    action: string,
    message: string,
    group?: string,
    subgroup?: string
  ) {
    const event: IEvent = {
      event: {
        action,
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
            namespace,
          },
        ],
      },
      message,
    };
    eventLogger.logEvent(event);
  }
}

interface ScheduleActionsForRecoveredInstancesParams {
  logger: Logger;
  recoveryActionGroup: ActionGroup;
  recoveredAlertInstances: Dictionary<AlertInstance>;
  executionHandler: ReturnType<typeof createExecutionHandler>;
  mutedInstanceIdsSet: Set<string>;
  alertLabel: string;
}

function scheduleActionsForRecoveredInstances(params: ScheduleActionsForRecoveredInstancesParams) {
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

interface LogActiveAndRecoveredInstancesParams {
  logger: Logger;
  activeAlertInstances: Dictionary<AlertInstance>;
  recoveredAlertInstances: Dictionary<AlertInstance>;
  alertLabel: string;
}

function logActiveAndRecoveredInstances(params: LogActiveAndRecoveredInstancesParams) {
  const { logger, activeAlertInstances, recoveredAlertInstances, alertLabel } = params;
  const activeInstanceIds = Object.keys(activeAlertInstances);
  const recoveredInstanceIds = Object.keys(recoveredAlertInstances);
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
