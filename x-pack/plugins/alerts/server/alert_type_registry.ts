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
import { RunContext, TaskManagerSetupContract } from '../../task_manager/server';
import { TaskRunnerFactory } from './task_runner';
import {
  AlertType,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from './types';
import { RecoveredActionGroup, getBuiltinActionGroups } from '../common';

interface ConstructorOptions {
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
}

export interface RegistryAlertType
  extends Pick<
    NormalizedAlertType,
    | 'name'
    | 'actionGroups'
    | 'recoveryActionGroup'
    | 'defaultActionGroupId'
    | 'actionVariables'
    | 'producer'
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

export type NormalizedAlertType<
  Params extends AlertTypeParams = AlertTypeParams,
  State extends AlertTypeState = AlertTypeState,
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
> = Omit<AlertType<Params, State, InstanceState, InstanceContext>, 'recoveryActionGroup'> &
  Pick<Required<AlertType<Params, State, InstanceState, InstanceContext>>, 'recoveryActionGroup'>;

export class AlertTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly alertTypes: Map<string, NormalizedAlertType> = new Map();
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

    const normalizedAlertType = augmentActionGroupsWithReserved(alertType as AlertType);

    this.alertTypes.set(alertIdSchema.validate(alertType.id), normalizedAlertType);
    this.taskManager.registerTaskDefinitions({
      [`alerting:${alertType.id}`]: {
        title: alertType.name,
        createTaskRunner: (context: RunContext) =>
          this.taskRunnerFactory.create(normalizedAlertType, context),
      },
    });
  }

  public get<
    Params extends AlertTypeParams = AlertTypeParams,
    State extends AlertTypeState = AlertTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext
  >(id: string): NormalizedAlertType<Params, State, InstanceState, InstanceContext> {
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
    return this.alertTypes.get(id)! as NormalizedAlertType<
      Params,
      State,
      InstanceState,
      InstanceContext
    >;
  }

  public list(): Set<RegistryAlertType> {
    return new Set(
      Array.from(this.alertTypes).map(
        ([
          id,
          {
            name,
            actionGroups,
            recoveryActionGroup,
            defaultActionGroupId,
            actionVariables,
            producer,
          },
        ]: [string, NormalizedAlertType]) => ({
          id,
          name,
          actionGroups,
          recoveryActionGroup,
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

function augmentActionGroupsWithReserved<
  Params extends AlertTypeParams,
  State extends AlertTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
>(
  alertType: AlertType<Params, State, InstanceState, InstanceContext>
): NormalizedAlertType<Params, State, InstanceState, InstanceContext> {
  const reservedActionGroups = getBuiltinActionGroups(alertType.recoveryActionGroup);
  const { id, actionGroups, recoveryActionGroup } = alertType;

  const activeActionGroups = new Set(actionGroups.map((item) => item.id));
  const intersectingReservedActionGroups = intersection(
    [...activeActionGroups.values()],
    reservedActionGroups.map((item) => item.id)
  );
  if (recoveryActionGroup && activeActionGroups.has(recoveryActionGroup.id)) {
    throw new Error(
      i18n.translate(
        'xpack.alerts.alertTypeRegistry.register.customRecoveryActionGroupUsageError',
        {
          defaultMessage:
            'Alert type [id="{id}"] cannot be registered. Action group [{actionGroup}] cannot be used as both a recovery and an active action group.',
          values: {
            actionGroup: recoveryActionGroup.id,
            id,
          },
        }
      )
    );
  } else if (intersectingReservedActionGroups.length > 0) {
    throw new Error(
      i18n.translate('xpack.alerts.alertTypeRegistry.register.reservedActionGroupUsageError', {
        defaultMessage:
          'Alert type [id="{id}"] cannot be registered. Action groups [{actionGroups}] are reserved by the framework.',
        values: {
          actionGroups: intersectingReservedActionGroups.join(', '),
          id,
        },
      })
    );
  }

  return {
    ...alertType,
    actionGroups: [...actionGroups, ...reservedActionGroups],
    recoveryActionGroup: recoveryActionGroup ?? RecoveredActionGroup,
  };
}
