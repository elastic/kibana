/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { ActionType as CommonActionType } from '../common';
import { ActionsConfigurationUtilities } from './actions_config';
import {
  ExecutorError,
  getActionTypeFeatureUsageName,
  TaskRunnerFactory,
  ILicenseState,
} from './lib';
import {
  ActionType,
  PreConfiguredAction,
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
} from './types';

export interface ActionTypeRegistryOpts {
  licensing: LicensingPluginSetup;
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
  actionsConfigUtils: ActionsConfigurationUtilities;
  licenseState: ILicenseState;
  preconfiguredActions: PreConfiguredAction[];
}

export class ActionTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly actionTypes: Map<string, ActionType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly actionsConfigUtils: ActionsConfigurationUtilities;
  private readonly licenseState: ILicenseState;
  private readonly preconfiguredActions: PreConfiguredAction[];
  private readonly licensing: LicensingPluginSetup;

  constructor(constructorParams: ActionTypeRegistryOpts) {
    this.taskManager = constructorParams.taskManager;
    this.taskRunnerFactory = constructorParams.taskRunnerFactory;
    this.actionsConfigUtils = constructorParams.actionsConfigUtils;
    this.licenseState = constructorParams.licenseState;
    this.preconfiguredActions = constructorParams.preconfiguredActions;
    this.licensing = constructorParams.licensing;
  }

  /**
   * Returns if the action type registry has the given action type registered
   */
  public has(id: string) {
    return this.actionTypes.has(id);
  }

  /**
   * Throws error if action type is not enabled.
   */
  public ensureActionTypeEnabled(id: string) {
    this.actionsConfigUtils.ensureActionTypeEnabled(id);
    // Important to happen last because the function will notify of feature usage at the
    // same time and it shouldn't notify when the action type isn't enabled
    this.licenseState.ensureLicenseForActionType(this.get(id));
  }

  /**
   * Returns true if action type is enabled in the config and a valid license is used.
   */
  public isActionTypeEnabled(
    id: string,
    options: { notifyUsage: boolean } = { notifyUsage: false }
  ) {
    return (
      this.actionsConfigUtils.isActionTypeEnabled(id) &&
      this.licenseState.isLicenseValidForActionType(this.get(id), options).isValid === true
    );
  }

  /**
   * Returns true if action type is enabled or it is a preconfigured action type.
   */
  public isActionExecutable(
    actionId: string,
    actionTypeId: string,
    options: { notifyUsage: boolean } = { notifyUsage: false }
  ) {
    const actionTypeEnabled = this.isActionTypeEnabled(actionTypeId, options);
    return (
      actionTypeEnabled ||
      (!actionTypeEnabled &&
        this.preconfiguredActions.find(
          (preconfiguredAction) => preconfiguredAction.id === actionId
        ) !== undefined)
    );
  }

  /**
   * Registers an action type to the action type registry
   */
  public register<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(actionType: ActionType<Config, Secrets, Params, ExecutorResultData>) {
    if (this.has(actionType.id)) {
      throw new Error(
        i18n.translate(
          'xpack.actions.actionTypeRegistry.register.duplicateActionTypeErrorMessage',
          {
            defaultMessage: 'Action type "{id}" is already registered.',
            values: {
              id: actionType.id,
            },
          }
        )
      );
    }
    this.actionTypes.set(actionType.id, { ...actionType } as unknown as ActionType);
    this.taskManager.registerTaskDefinitions({
      [`actions:${actionType.id}`]: {
        title: actionType.name,
        maxAttempts: actionType.maxAttempts || 1,
        getRetry(attempts: number, error: unknown) {
          if (error instanceof ExecutorError) {
            return error.retry == null ? false : error.retry;
          }
          // Don't retry other kinds of errors
          return false;
        },
        createTaskRunner: (context: RunContext) =>
          this.taskRunnerFactory.create(context, actionType.maxAttempts),
      },
    });
    // No need to notify usage on basic action types
    if (actionType.minimumLicenseRequired !== 'basic') {
      this.licensing.featureUsage.register(
        getActionTypeFeatureUsageName(actionType as unknown as ActionType),
        actionType.minimumLicenseRequired
      );
    }
  }

  /**
   * Returns an action type, throws if not registered
   */
  public get<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(id: string): ActionType<Config, Secrets, Params, ExecutorResultData> {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.actionTypeRegistry.get.missingActionTypeErrorMessage', {
          defaultMessage: 'Action type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.actionTypes.get(id)! as ActionType<Config, Secrets, Params, ExecutorResultData>;
  }

  /**
   * Returns a list of registered action types [{ id, name, enabled }]
   */
  public list(): CommonActionType[] {
    return Array.from(this.actionTypes).map(([actionTypeId, actionType]) => ({
      id: actionTypeId,
      name: actionType.name,
      minimumLicenseRequired: actionType.minimumLicenseRequired,
      enabled: this.isActionTypeEnabled(actionTypeId),
      enabledInConfig: this.actionsConfigUtils.isActionTypeEnabled(actionTypeId),
      enabledInLicense: !!this.licenseState.isLicenseValidForActionType(actionType).isValid,
    }));
  }
}
