/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, mapValues, omit } from 'lodash';
import { Logger } from '../../../../../src/core/server';
import { SavedObject } from '../../../../../src/core/server';
import { TaskRunnerContext } from './task_runner_factory';
import { ConcreteTaskInstance } from '../../../../plugins/task_manager/server';
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
  RawAlertInstance,
  AlertTaskState,
} from '../types';
import { promiseResult, map, Resultable, asOk, asErr, resolveErr } from '../lib/result_type';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { AlertInstances } from '../alert_instance/alert_instance';

const FALLBACK_RETRY_INTERVAL: IntervalSchedule = { interval: '5m' };

interface AlertTaskRunResult {
  state: AlertTaskState;
  runAt: Date;
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
    } = await this.context.encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<RawAlert>(
      'alert',
      alertId,
      { namespace }
    );

    return apiKey;
  }

  async getServicesWithSpaceLevelPermissions(spaceId: string, apiKey: string | null) {
    const requestHeaders: Record<string, string> = {};

    if (apiKey) {
      requestHeaders.authorization = `ApiKey ${apiKey}`;
    }

    const fakeRequest = {
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
    };

    return this.context.getServices(fakeRequest);
  }

  getExecutionHandler(
    alertId: string,
    spaceId: string,
    apiKey: string | null,
    actions: RawAlert['actions'],
    references: SavedObject['references']
  ) {
    // Inject ids into actions
    const actionsWithIds = actions.map(action => {
      const actionReference = references.find(obj => obj.name === action.actionRef);
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
      logger: this.logger,
      executeAction: this.context.executeAction,
      apiKey,
      actions: actionsWithIds,
      spaceId,
      alertType: this.alertType,
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

    const alertInstances = mapValues<RawAlertInstance, AlertInstance>(
      alertRawInstances,
      rawAlertInstance => new AlertInstance(rawAlertInstance)
    );

    const updatedAlertTypeState = await this.alertType.executor({
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

    // Cleanup alert instances that are no longer scheduling actions to avoid over populating the alertInstances object
    const instancesWithScheduledActions = pick<AlertInstances, AlertInstances>(
      alertInstances,
      (alertInstance: AlertInstance) => alertInstance.hasScheduledActions()
    );

    if (!muteAll) {
      const enabledAlertInstances = omit<AlertInstances, AlertInstances>(
        instancesWithScheduledActions,
        ...mutedInstanceIds
      );

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
      alertInstances: mapValues<AlertInstance, RawAlertInstance>(
        instancesWithScheduledActions,
        alertInstance => alertInstance.toRaw()
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
          this.logger.error(`Executing Alert "${alertId}" has resulted in Error: ${err.message}`);
          return {
            ...originalState,
            previousStartedAt,
          };
        }
      ),
      runAt: resolveErr<Date, Error>(runAt, () =>
        getNextRunAt(
          new Date(),
          // if we fail at this point we wish to recover but don't have access to the Alert's
          // attributes, so we'll use a default interval to prevent the underlying task from
          // falling into a failed state
          FALLBACK_RETRY_INTERVAL
        )
      ),
    };
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
