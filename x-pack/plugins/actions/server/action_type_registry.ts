/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { RunContext, TaskManagerSetupContract } from '../../task_manager/server';
import { ExecutorError, TaskRunnerFactory, ILicenseState } from './lib';
import { ActionType, PreConfiguredAction } from './types';
import { ActionType as CommonActionType } from '../common';
import { ActionsConfigurationUtilities } from './actions_config';

export interface ActionTypeRegistryOpts {
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

  constructor(constructorParams: ActionTypeRegistryOpts) {
    this.taskManager = constructorParams.taskManager;
    this.taskRunnerFactory = constructorParams.taskRunnerFactory;
    this.actionsConfigUtils = constructorParams.actionsConfigUtils;
    this.licenseState = constructorParams.licenseState;
    this.preconfiguredActions = constructorParams.preconfiguredActions;
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
    this.licenseState.ensureLicenseForActionType(this.get(id));
  }

  /**
   * Returns true if action type is enabled in the config and a valid license is used.
   */
  public isActionTypeEnabled(id: string) {
    return (
      this.actionsConfigUtils.isActionTypeEnabled(id) &&
      this.licenseState.isLicenseValidForActionType(this.get(id)).isValid === true
    );
  }

  /**
   * Returns true if action type is enabled or it is a preconfigured action type.
   */
  public isActionExecutable(actionId: string, actionTypeId: string) {
    return (
      this.isActionTypeEnabled(actionTypeId) ||
      (!this.isActionTypeEnabled(actionTypeId) &&
        this.preconfiguredActions.find(
          (preconfiguredAction) => preconfiguredAction.id === actionId
        ) !== undefined)
    );
  }

  /**
   * Registers an action type to the action type registry
   */
  public register(actionType: ActionType) {
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
    this.actionTypes.set(actionType.id, { ...actionType });
    this.taskManager.registerTaskDefinitions({
      [`actions:${actionType.id}`]: {
        title: actionType.name,
        type: `actions:${actionType.id}`,
        maxAttempts: actionType.maxAttempts || 1,
        getRetry(attempts: number, error: unknown) {
          if (error instanceof ExecutorError) {
            return error.retry == null ? false : error.retry;
          }
          // Don't retry other kinds of errors
          return false;
        },
        createTaskRunner: (context: RunContext) => this.taskRunnerFactory.create(context),
      },
    });
  }

  /**
   * Returns an action type, throws if not registered
   */
  public get(id: string): ActionType {
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
    return this.actionTypes.get(id)!;
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
      enabledInLicense: this.licenseState.isLicenseValidForActionType(actionType).isValid === true,
    }));
  }
}
