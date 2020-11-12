/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import typeDetect from 'type-detect';
import { intersection } from 'lodash';
import _ from 'lodash';
import { RunContext, TaskManagerSetupContract } from '../../task_manager/server';
import { TaskRunnerFactory } from './task_runner';
import {
  AlertType,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  ActionGroup,
} from './types';
import { getBuiltinActionGroups } from '../common';

interface ConstructorOptions {
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
}

export interface RegistryAlertType
  extends Pick<
    AlertType,
    'name' | 'actionGroups' | 'defaultActionGroupId' | 'actionVariables' | 'producer'
  > {
  id: string;
}

/**
 * AlertType IDs are used as part of the authorization strings used to
 * grant users privileged operations. There is a limited range of characters
 * we can use in these auth strings, so we apply these same limitations to
 * the AlertType Ids.
 * If you wish to change this, please confer with the Kibana security team.
 */
const alertIdSchema = schema.string({
  validate(value: string): string | void {
    if (typeof value !== 'string') {
      return `expected AlertType Id of type [string] but got [${typeDetect(value)}]`;
    } else if (!value.match(/^[a-zA-Z0-9_\-\.]*$/)) {
      const invalid = value.match(/[^a-zA-Z0-9_\-\.]+/g)!;
      return `expected AlertType Id not to include invalid character${
        invalid.length > 1 ? `s` : ``
      }: ${invalid?.join(`, `)}`;
    }
  },
});

export class AlertTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly alertTypes: Map<string, AlertType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;

  constructor({ taskManager, taskRunnerFactory }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.taskRunnerFactory = taskRunnerFactory;
  }

  public has(id: string) {
    return this.alertTypes.has(id);
  }

  public register<
    Params extends AlertTypeParams = AlertTypeParams,
    State extends AlertTypeState = AlertTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext
  >(alertType: AlertType<Params, State, InstanceState, InstanceContext>) {
    if (this.has(alertType.id)) {
      throw new Error(
        i18n.translate('xpack.alerts.alertTypeRegistry.register.duplicateAlertTypeError', {
          defaultMessage: 'Alert type "{id}" is already registered.',
          values: {
            id: alertType.id,
          },
        })
      );
    }
    alertType.actionVariables = normalizedActionVariables(alertType.actionVariables);
    validateActionGroups(alertType.id, alertType.actionGroups);
    alertType.actionGroups = [...alertType.actionGroups, ..._.cloneDeep(getBuiltinActionGroups())];
    this.alertTypes.set(alertIdSchema.validate(alertType.id), { ...alertType } as AlertType);
    this.taskManager.registerTaskDefinitions({
      [`alerting:${alertType.id}`]: {
        title: alertType.name,
        createTaskRunner: (context: RunContext) =>
          this.taskRunnerFactory.create({ ...alertType } as AlertType, context),
      },
    });
  }

  public get<
    Params extends AlertTypeParams = AlertTypeParams,
    State extends AlertTypeState = AlertTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext
  >(id: string): AlertType<Params, State, InstanceState, InstanceContext> {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerts.alertTypeRegistry.get.missingAlertTypeError', {
          defaultMessage: 'Alert type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.alertTypes.get(id)! as AlertType<Params, State, InstanceState, InstanceContext>;
  }

  public list(): Set<RegistryAlertType> {
    return new Set(
      Array.from(this.alertTypes).map(
        ([id, { name, actionGroups, defaultActionGroupId, actionVariables, producer }]: [
          string,
          AlertType
        ]) => ({
          id,
          name,
          actionGroups,
          defaultActionGroupId,
          actionVariables,
          producer,
        })
      )
    );
  }
}

function normalizedActionVariables(actionVariables: AlertType['actionVariables']) {
  return {
    context: actionVariables?.context ?? [],
    state: actionVariables?.state ?? [],
    params: actionVariables?.params ?? [],
  };
}

function validateActionGroups(alertTypeId: string, actionGroups: ActionGroup[]) {
  const reservedActionGroups = intersection(
    actionGroups.map((item) => item.id),
    getBuiltinActionGroups().map((item) => item.id)
  );
  if (reservedActionGroups.length > 0) {
    throw Boom.badRequest(
      i18n.translate('xpack.alerts.alertTypeRegistry.register.reservedActionGroupUsageError', {
        defaultMessage:
          'Alert type by id {alertTypeId} cannot be registered. Action groups [{actionGroups}] is reserved by framework.',
        values: {
          actionGroups: reservedActionGroups.join(', '),
          alertTypeId,
        },
      })
    );
  }
}
