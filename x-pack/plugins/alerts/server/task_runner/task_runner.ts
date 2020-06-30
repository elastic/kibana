/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pickBy, mapValues, omit, without } from 'lodash';
import { Logger, SavedObject, KibanaRequest } from '../../../../../src/core/server';
import { TaskRunnerContext } from './task_runner_factory';
import { ConcreteTaskInstance } from '../../../task_manager/server';
import { createExecutionHandler } from './create_execution_handler';
import { AlertInstance, createAlertInstanceFactory } from '../alert_instance';
import { getNextRunAt } from './get_next_run_at';
import { validateAlertTypeParams } from '../lib';
import {
  AlertType,
  RawAlert,
  IntervalSchedule,
  Services,
  AlertInfoParams,
  AlertTaskState,
  RawAlertInstance,
} from '../types';
import { promiseResult, map, Resultable, asOk, asErr, resolveErr } from '../lib/result_type';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { IEvent, IEventLogger, SAVED_OBJECT_REL_PRIMARY } from '../../../event_log/server';
import { isAlertSavedObjectNotFoundError } from '../lib/is_alert_not_found_error';

const FALLBACK_RETRY_INTERVAL: IntervalSchedule = { interval: '5m' };

interface AlertTaskRunResult {
  state: AlertTaskState;
  runAt: Date | undefined;
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

  private getFakeKibanaRequest(spaceId: string, apiKey: string | null) {
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

  async getServicesWithSpaceLevelPermissions(spaceId: string, apiKey: string | null) {
    return this.context.getServices(this.getFakeKibanaRequest(spaceId, apiKey));
  }

  private getExecutionHandler(
    alertId: string,
    alertName: string,
    tags: string[] | undefined,
    spaceId: string,
    apiKey: string | null,
    actions: RawAlert['actions'],
    references: SavedObject['references']
  ) {
    // Inject ids into actions
    const actionsWithIds = actions.map((action) => {
      const actionReference = references.find((obj) => obj.name === action.actionRef);
      if (!actionReference) {
        throw new Error(`Action reference "${action.actionRef}" not found in alert id: ${alertId}`);
      }
      return {
        ...action,
        id: actionReference.id,
      };
    });

    return createExecutionHandler({
      alertId,
      alertName,
      tags,
      logger: this.logger,
      actionsPlugin: this.context.actionsPlugin,
      apiKey,
      actions: actionsWithIds,
      spaceId,
      alertType: this.alertType,
      eventLogger: this.context.eventLogger,
      request: this.getFakeKibanaRequest(spaceId, apiKey),
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
    alertInfoParams: AlertInfoParams,
    executionHandler: ReturnType<typeof createExecutionHandler>,
    spaceId: string
  ): Promise<AlertTaskState> {
    const {
      params,
      throttle,
      muteAll,
      mutedInstanceIds,
      name,
      tags,
      createdBy,
      updatedBy,
    } = alertInfoParams;
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
      throw err;
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
    const currentAlertInstanceIds = Object.keys(instancesWithScheduledActions);
    generateNewAndResolvedInstanceEvents({
      eventLogger,
      originalAlertInstanceIds,
      currentAlertInstanceIds,
      alertId,
      alertLabel,
      namespace,
    });

    if (!muteAll) {
      const enabledAlertInstances = omit(instancesWithScheduledActions, ...mutedInstanceIds);

      await Promise.all(
        Object.entries(enabledAlertInstances)
          .filter(
            ([, alertInstance]: [string, AlertInstance]) => !alertInstance.isThrottled(throttle)
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
    apiKey: string | null,
    attributes: RawAlert,
    references: SavedObject['references']
  ) {
    const {
      params: { alertId, spaceId },
    } = this.taskInstance;

    // Validate
    const params = validateAlertTypeParams(this.alertType, attributes.params);
    const executionHandler = this.getExecutionHandler(
      alertId,
      attributes.name,
      attributes.tags,
      spaceId,
      apiKey,
      attributes.actions,
      references
    );
    return this.executeAlertInstances(
      services,
      { ...attributes, params },
      executionHandler,
      spaceId
    );
  }

  async loadAlertAttributesAndRun(): Promise<Resultable<AlertTaskRunResult, Error>> {
    const {
      params: { alertId, spaceId },
    } = this.taskInstance;

    const apiKey = await this.getApiKeyForAlertPermissions(alertId, spaceId);
    const services = await this.getServicesWithSpaceLevelPermissions(spaceId, apiKey);

    // Ensure API key is still valid and user has access
    const { attributes, references } = await services.savedObjectsClient.get<RawAlert>(
      'alert',
      alertId
    );

    return {
      state: await promiseResult<AlertTaskState, Error>(
        this.validateAndExecuteAlert(services, apiKey, attributes, references)
      ),
      runAt: asOk(
        getNextRunAt(
          new Date(this.taskInstance.startedAt!),
          // we do not currently have a good way of returning the type
          // from SavedObjectsClient, and as we currenrtly require a schedule
          // and we only support `interval`, we can cast this safely
          attributes.schedule as IntervalSchedule
        )
      ),
    };
  }

  async run(): Promise<AlertTaskRunResult> {
    const {
      params: { alertId },
      startedAt: previousStartedAt,
      state: originalState,
    } = this.taskInstance;

    const { state, runAt } = await errorAsAlertTaskRunResult(this.loadAlertAttributesAndRun());

    return {
      state: map<AlertTaskState, Error, AlertTaskState>(
        state,
        (stateUpdates: AlertTaskState) => {
          return {
            ...stateUpdates,
            previousStartedAt,
          };
        },
        (err: Error) => {
          const message = `Executing Alert "${alertId}" has resulted in Error: ${err.message}`;
          if (isAlertSavedObjectNotFoundError(err, alertId)) {
            this.logger.debug(message);
          } else {
            this.logger.error(message);
          }
          return {
            ...originalState,
            previousStartedAt,
          };
        }
      ),
      runAt: resolveErr<Date | undefined, Error>(runAt, (err) => {
        return isAlertSavedObjectNotFoundError(err, alertId)
          ? undefined
          : getNextRunAt(
              new Date(),
              // if we fail at this point we wish to recover but don't have access to the Alert's
              // attributes, so we'll use a default interval to prevent the underlying task from
              // falling into a failed state
              FALLBACK_RETRY_INTERVAL
            );
      }),
    };
  }
}

interface GenerateNewAndResolvedInstanceEventsParams {
  eventLogger: IEventLogger;
  originalAlertInstanceIds: string[];
  currentAlertInstanceIds: string[];
  alertId: string;
  alertLabel: string;
  namespace: string | undefined;
}

function generateNewAndResolvedInstanceEvents(params: GenerateNewAndResolvedInstanceEventsParams) {
  const { currentAlertInstanceIds, originalAlertInstanceIds } = params;
  const newIds = without(currentAlertInstanceIds, ...originalAlertInstanceIds);
  const resolvedIds = without(originalAlertInstanceIds, ...currentAlertInstanceIds);

  for (const id of newIds) {
    const message = `${params.alertLabel} created new instance: '${id}'`;
    logInstanceEvent(id, EVENT_LOG_ACTIONS.newInstance, message);
  }

  for (const id of resolvedIds) {
    const message = `${params.alertLabel} resolved instance: '${id}'`;
    logInstanceEvent(id, EVENT_LOG_ACTIONS.resolvedInstance, message);
  }

  function logInstanceEvent(id: string, action: string, message: string) {
    const event: IEvent = {
      event: {
        action,
      },
      kibana: {
        alerting: {
          instance_id: id,
        },
        saved_objects: [
          {
            rel: SAVED_OBJECT_REL_PRIMARY,
            type: 'alert',
            id: params.alertId,
            namespace: params.namespace,
          },
        ],
      },
      message,
    };
    params.eventLogger.logEvent(event);
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
      runAt: asErr(e),
    };
  }
}
