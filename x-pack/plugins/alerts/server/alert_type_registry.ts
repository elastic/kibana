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
import { LicensingPluginSetup } from '../../licensing/server';
import { RunContext, TaskManagerSetupContract } from '../../task_manager/server';
import { TaskRunnerFactory } from './task_runner';
import {
  AlertType,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from './types';
import {
  RecoveredActionGroup,
  getBuiltinActionGroups,
  RecoveredActionGroupId,
  ActionGroup,
} from '../common';
import { ILicenseState } from './lib/license_state';
import { getAlertTypeFeatureUsageName } from './lib/get_alert_type_feature_usage_name';

export interface ConstructorOptions {
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
  licenseState: ILicenseState;
  licensing: LicensingPluginSetup;
}

export interface RegistryAlertType
  extends Pick<
    UntypedNormalizedAlertType,
    | 'name'
    | 'actionGroups'
    | 'recoveryActionGroup'
    | 'defaultActionGroupId'
    | 'actionVariables'
    | 'producer'
    | 'minimumLicenseRequired'
  > {
  id: string;
  enabledInLicense: boolean;
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
  Params extends AlertTypeParams,
  State extends AlertTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> = {
  actionGroups: Array<ActionGroup<ActionGroupIds | RecoveryActionGroupId>>;
} & Omit<
  AlertType<Params, State, InstanceState, InstanceContext, ActionGroupIds, RecoveryActionGroupId>,
  'recoveryActionGroup' | 'actionGroups'
> &
  Pick<
    Required<
      AlertType<
        Params,
        State,
        InstanceState,
        InstanceContext,
        ActionGroupIds,
        RecoveryActionGroupId
      >
    >,
    'recoveryActionGroup'
  >;

export type UntypedNormalizedAlertType = NormalizedAlertType<
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  string,
  string
>;

export class AlertTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly alertTypes: Map<string, UntypedNormalizedAlertType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly licenseState: ILicenseState;
  private readonly licensing: LicensingPluginSetup;

  constructor({ taskManager, taskRunnerFactory, licenseState, licensing }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.taskRunnerFactory = taskRunnerFactory;
    this.licenseState = licenseState;
    this.licensing = licensing;
  }

  public has(id: string) {
    return this.alertTypes.has(id);
  }

  public ensureAlertTypeEnabled(id: string) {
    this.licenseState.ensureLicenseForAlertType(this.get(id));
  }

  public register<
    Params extends AlertTypeParams,
    State extends AlertTypeState,
    InstanceState extends AlertInstanceState,
    InstanceContext extends AlertInstanceContext,
    ActionGroupIds extends string,
    RecoveryActionGroupId extends string
  >(
    alertType: AlertType<
      Params,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >
  ) {
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

    const normalizedAlertType = augmentActionGroupsWithReserved<
      Params,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >(alertType);

    this.alertTypes.set(
      alertIdSchema.validate(alertType.id),
      /** stripping the typing is required in order to store the AlertTypes in a Map */
      (normalizedAlertType as unknown) as UntypedNormalizedAlertType
    );
    this.taskManager.registerTaskDefinitions({
      [`alerting:${alertType.id}`]: {
        title: alertType.name,
        createTaskRunner: (context: RunContext) =>
          this.taskRunnerFactory.create<
            Params,
            State,
            InstanceState,
            InstanceContext,
            ActionGroupIds,
            RecoveryActionGroupId | RecoveredActionGroupId
          >(normalizedAlertType, context),
      },
    });
    // No need to notify usage on basic alert types
    if (alertType.minimumLicenseRequired !== 'basic') {
      this.licensing.featureUsage.register(
        getAlertTypeFeatureUsageName(alertType.name),
        alertType.minimumLicenseRequired
      );
    }
  }

  public get<
    Params extends AlertTypeParams = AlertTypeParams,
    State extends AlertTypeState = AlertTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext,
    ActionGroupIds extends string = string,
    RecoveryActionGroupId extends string = string
  >(
    id: string
  ): NormalizedAlertType<
    Params,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  > {
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
    /**
     * When we store the AlertTypes in the Map we strip the typing.
     * This means that returning a typed AlertType in `get` is an inherently
     * unsafe operation. Down casting to `unknown` is the only way to achieve this.
     */
    return (this.alertTypes.get(id)! as unknown) as NormalizedAlertType<
      Params,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
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
            minimumLicenseRequired,
          },
        ]: [string, UntypedNormalizedAlertType]) => ({
          id,
          name,
          actionGroups,
          recoveryActionGroup,
          defaultActionGroupId,
          actionVariables,
          producer,
          minimumLicenseRequired,
          enabledInLicense: !!this.licenseState.getLicenseCheckForAlertType(
            id,
            name,
            minimumLicenseRequired
          ).isValid,
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
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  alertType: AlertType<
    Params,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >
): NormalizedAlertType<
  Params,
  State,
  InstanceState,
  InstanceContext,
  ActionGroupIds,
  RecoveredActionGroupId | RecoveryActionGroupId
> {
  const reservedActionGroups = getBuiltinActionGroups(alertType.recoveryActionGroup);
  const { id, actionGroups, recoveryActionGroup } = alertType;

  const activeActionGroups = new Set<string>(actionGroups.map((item) => item.id));
  const intersectingReservedActionGroups = intersection<string>(
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
