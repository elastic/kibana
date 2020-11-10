/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { Dictionary, pickBy, mapValues, without } from 'lodash';
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
  AlertType,
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
import { ResolvedActionGroup } from '../../common';

const FALLBACK_RETRY_INTERVAL = '5m';

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
  private alertType: AlertType;

  constructor(
    alertType: AlertType,
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

    return ({
      headers: requestHeaders,
      getBasePath: () => this.context.getBasePath(spaceId),
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
    } as unknown) as KibanaRequest;
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
    const { actionGroup, context, state } = alertInstance.getScheduledActionOptions()!;
    alertInstance.updateLastScheduledActions(actionGroup);
    alertInstance.unscheduleActions();
    return executionHandler({ actionGroup, context, state, alertInstanceId });
  }

  async executeAlertInstances(
    services: Services,
    alert: SanitizedAlert,
    params: AlertExecutorOptions['params'],
    executionHandler: ReturnType<typeof createExecutionHandler>,
    spaceId: string
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

    const originalAlertInstanceIds = Object.keys(alertInstances);
    const eventLogger = this.context.eventLogger;
    const alertLabel = `${this.alertType.id}:${alertId}: '${name}'`;
    const event: IEvent = {
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
      eventLogger.stopTiming(event);
      event.message = `alert execution failure: ${alertLabel}`;
      event.error = event.error || {};
      event.error.message = err.message;
      event.event = event.event || {};
      event.event.outcome = 'failure';
      eventLogger.logEvent(event);
      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.Execute, err);
    }

    eventLogger.stopTiming(event);
    event.message = `alert executed: ${alertLabel}`;
    event.event = event.event || {};
    event.event.outcome = 'success';
    eventLogger.logEvent(event);

    // Cleanup alert instances that are no longer scheduling actions to avoid over populating the alertInstances object
    const instancesWithScheduledActions = pickBy(alertInstances, (alertInstance: AlertInstance) =>
      alertInstance.hasScheduledActions()
    );

    scheduleActionsForResolvedInstances(
      alertInstances,
      executionHandler,
      originalAlertInstanceIds,
      currentAlertInstanceIds
    );

    generateNewAndResolvedInstanceEvents({
      eventLogger,
      originalAlertInstanceIds,
      currentAlertInstances: instancesWithScheduledActions,
      alertId,
      alertLabel,
      namespace,
    });

    if (!muteAll) {
      const mutedInstanceIdsSet = new Set(mutedInstanceIds);

      await Promise.all(
        Object.entries(instancesWithScheduledActions)
          .filter(
            ([alertInstanceName, alertInstance]: [string, AlertInstance]) =>
              !alertInstance.isThrottled(throttle) && !mutedInstanceIdsSet.has(alertInstanceName)
          )
          .map(([id, alertInstance]: [string, AlertInstance]) =>
            this.executeAlertInstance(id, alertInstance, executionHandler)
          )
      );
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
    alert: SanitizedAlert
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
    return this.executeAlertInstances(services, alert, validatedParams, executionHandler, spaceId);
  }

  async loadAlertAttributesAndRun(): Promise<Resultable<AlertTaskRunResult, Error>> {
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
        this.validateAndExecuteAlert(services, apiKey, alert)
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

    const { state, schedule } = await errorAsAlertTaskRunResult(this.loadAlertAttributesAndRun());
    const namespace = spaceId === 'default' ? undefined : spaceId;

    const executionStatus: AlertExecutionStatus = map(
      state,
      (alertTaskState: AlertTaskState) => executionStatusFromState(alertTaskState),
      (err: Error) => executionStatusFromError(err)
    );
    this.logger.debug(
      `alertExecutionStatus for ${this.alertType.id}:${alertId}: ${JSON.stringify(executionStatus)}`
    );

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

interface GenerateNewAndResolvedInstanceEventsParams {
  eventLogger: IEventLogger;
  originalAlertInstanceIds: string[];
  currentAlertInstances: Dictionary<AlertInstance>;
  alertId: string;
  alertLabel: string;
  namespace: string | undefined;
}

function generateNewAndResolvedInstanceEvents(params: GenerateNewAndResolvedInstanceEventsParams) {
  const {
    eventLogger,
    alertId,
    namespace,
    currentAlertInstances,
    originalAlertInstanceIds,
  } = params;
  const currentAlertInstanceIds = Object.keys(currentAlertInstances);

  const newIds = without(currentAlertInstanceIds, ...originalAlertInstanceIds);
  const resolvedIds = without(originalAlertInstanceIds, ...currentAlertInstanceIds);

  for (const id of resolvedIds) {
    const message = `${params.alertLabel} resolved instance: '${id}'`;
    logInstanceEvent(id, EVENT_LOG_ACTIONS.resolvedInstance, message);
  }

  for (const id of newIds) {
    const message = `${params.alertLabel} created new instance: '${id}'`;
    logInstanceEvent(id, EVENT_LOG_ACTIONS.newInstance, message);
  }

  for (const id of currentAlertInstanceIds) {
    const actionGroup = currentAlertInstances[id].getScheduledActionOptions()?.actionGroup;
    const message = `${params.alertLabel} active instance: '${id}' in actionGroup: '${actionGroup}'`;
    logInstanceEvent(id, EVENT_LOG_ACTIONS.activeInstance, message, actionGroup);
  }

  function logInstanceEvent(instanceId: string, action: string, message: string, group?: string) {
    const event: IEvent = {
      event: {
        action,
      },
      kibana: {
        alerting: {
          instance_id: instanceId,
          action_group_id: group,
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

function scheduleActionsForResolvedInstances(
  alertInstancesMap: {
    [x: string]: AlertInstance<
      {
        [x: string]: unknown;
      },
      {
        [x: string]: unknown;
      }
    >;
  },
  executionHandler: ReturnType<typeof createExecutionHandler>,
  originalAlertInstanceIds: string[],
  currentAlertInstanceIds: string[]
) {
  const resolvedIds = without(originalAlertInstanceIds, ...currentAlertInstanceIds);
  for (const id of resolvedIds) {
    alertInstancesMap[id].updateLastScheduledActions(ResolvedActionGroup.id);
    alertInstancesMap[id].unscheduleActions();
    executionHandler({
      actionGroup: ResolvedActionGroup.id,
      context: {},
      state: {},
      alertInstanceId: id,
    });
    alertInstancesMap[id].scheduleActions(ResolvedActionGroup.id);
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
