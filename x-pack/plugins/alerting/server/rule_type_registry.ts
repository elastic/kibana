/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  RuleType,
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
  validateDurationSchema,
  parseDuration,
} from '../common';
import { ILicenseState } from './lib/license_state';
import { getRuleTypeFeatureUsageName } from './lib/get_rule_type_feature_usage_name';

export interface ConstructorOptions {
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
  licenseState: ILicenseState;
  licensing: LicensingPluginSetup;
  minimumScheduleInterval: string;
}

export interface RegistryRuleType
  extends Pick<
    UntypedNormalizedRuleType,
    | 'name'
    | 'actionGroups'
    | 'recoveryActionGroup'
    | 'defaultActionGroupId'
    | 'actionVariables'
    | 'producer'
    | 'minimumLicenseRequired'
    | 'isExportable'
    | 'ruleTaskTimeout'
    | 'defaultScheduleInterval'
    | 'doesSetRecoveryContext'
  > {
  id: string;
  enabledInLicense: boolean;
}

/**
 * RuleType IDs are used as part of the authorization strings used to
 * grant users privileged operations. There is a limited range of characters
 * we can use in these auth strings, so we apply these same limitations to
 * the RuleType Ids.
 * If you wish to change this, please confer with the Kibana security team.
 */
const ruleTypeIdSchema = schema.string({
  validate(value: string): string | void {
    if (typeof value !== 'string') {
      return `expected RuleType Id of type [string] but got [${typeDetect(value)}]`;
    } else if (!value.match(/^[a-zA-Z0-9_\-\.]*$/)) {
      const invalid = value.match(/[^a-zA-Z0-9_\-\.]+/g)!;
      return `expected RuleType Id not to include invalid character${
        invalid.length > 1 ? `s` : ``
      }: ${invalid?.join(`, `)}`;
    }
  },
});

export type NormalizedRuleType<
  Params extends AlertTypeParams,
  ExtractedParams extends AlertTypeParams,
  State extends AlertTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> = {
  actionGroups: Array<ActionGroup<ActionGroupIds | RecoveryActionGroupId>>;
} & Omit<
  RuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >,
  'recoveryActionGroup' | 'actionGroups'
> &
  Pick<
    Required<
      RuleType<
        Params,
        ExtractedParams,
        State,
        InstanceState,
        InstanceContext,
        ActionGroupIds,
        RecoveryActionGroupId
      >
    >,
    'recoveryActionGroup'
  >;

export type UntypedNormalizedRuleType = NormalizedRuleType<
  AlertTypeParams,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  string,
  string
>;

export class RuleTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly ruleTypes: Map<string, UntypedNormalizedRuleType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly licenseState: ILicenseState;
  private readonly minimumScheduleInterval: string;
  private readonly licensing: LicensingPluginSetup;

  constructor({
    taskManager,
    taskRunnerFactory,
    licenseState,
    licensing,
    minimumScheduleInterval,
  }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.taskRunnerFactory = taskRunnerFactory;
    this.licenseState = licenseState;
    this.licensing = licensing;
    this.minimumScheduleInterval = minimumScheduleInterval;
  }

  public has(id: string) {
    return this.ruleTypes.has(id);
  }

  public ensureRuleTypeEnabled(id: string) {
    this.licenseState.ensureLicenseForRuleType(this.get(id));
  }

  public register<
    Params extends AlertTypeParams,
    ExtractedParams extends AlertTypeParams,
    State extends AlertTypeState,
    InstanceState extends AlertInstanceState,
    InstanceContext extends AlertInstanceContext,
    ActionGroupIds extends string,
    RecoveryActionGroupId extends string
  >(
    ruleType: RuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >
  ) {
    if (this.has(ruleType.id)) {
      throw new Error(
        i18n.translate('xpack.alerting.ruleTypeRegistry.register.duplicateRuleTypeError', {
          defaultMessage: 'Rule type "{id}" is already registered.',
          values: {
            id: ruleType.id,
          },
        })
      );
    }
    // validate ruleTypeTimeout here
    if (ruleType.ruleTaskTimeout) {
      const invalidTimeout = validateDurationSchema(ruleType.ruleTaskTimeout);
      if (invalidTimeout) {
        throw new Error(
          i18n.translate('xpack.alerting.ruleTypeRegistry.register.invalidTimeoutRuleTypeError', {
            defaultMessage: 'Rule type "{id}" has invalid timeout: {errorMessage}.',
            values: {
              id: ruleType.id,
              errorMessage: invalidTimeout,
            },
          })
        );
      }
    }
    ruleType.actionVariables = normalizedActionVariables(ruleType.actionVariables);

    // validate defaultScheduleInterval here
    if (ruleType.defaultScheduleInterval) {
      const invalidDefaultTimeout = validateDurationSchema(ruleType.defaultScheduleInterval);
      if (invalidDefaultTimeout) {
        throw new Error(
          i18n.translate(
            'xpack.alerting.ruleTypeRegistry.register.invalidDefaultTimeoutRuleTypeError',
            {
              defaultMessage: 'Rule type "{id}" has invalid default interval: {errorMessage}.',
              values: {
                id: ruleType.id,
                errorMessage: invalidDefaultTimeout,
              },
            }
          )
        );
      }

      const defaultIntervalInMs = parseDuration(ruleType.defaultScheduleInterval);
      const minimumIntervalInMs = parseDuration(this.minimumScheduleInterval);
      if (defaultIntervalInMs < minimumIntervalInMs) {
        throw new Error(
          i18n.translate(
            'xpack.alerting.ruleTypeRegistry.register.defaultTimeoutTooShortRuleTypeError',
            {
              defaultMessage:
                'Rule type "{id}" cannot specify a default interval less than {minimumInterval}.',
              values: {
                id: ruleType.id,
                minimumInterval: this.minimumScheduleInterval,
              },
            }
          )
        );
      }
    }

    const normalizedRuleType = augmentActionGroupsWithReserved<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >(ruleType);

    this.ruleTypes.set(
      ruleTypeIdSchema.validate(ruleType.id),
      /** stripping the typing is required in order to store the RuleTypes in a Map */
      normalizedRuleType as unknown as UntypedNormalizedRuleType
    );
    this.taskManager.registerTaskDefinitions({
      [`alerting:${ruleType.id}`]: {
        title: ruleType.name,
        timeout: ruleType.ruleTaskTimeout,
        createTaskRunner: (context: RunContext) =>
          this.taskRunnerFactory.create<
            Params,
            ExtractedParams,
            State,
            InstanceState,
            InstanceContext,
            ActionGroupIds,
            RecoveryActionGroupId | RecoveredActionGroupId
          >(normalizedRuleType, context),
      },
    });
    // No need to notify usage on basic alert types
    if (ruleType.minimumLicenseRequired !== 'basic') {
      this.licensing.featureUsage.register(
        getRuleTypeFeatureUsageName(ruleType.name),
        ruleType.minimumLicenseRequired
      );
    }
  }

  public get<
    Params extends AlertTypeParams = AlertTypeParams,
    ExtractedParams extends AlertTypeParams = AlertTypeParams,
    State extends AlertTypeState = AlertTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext,
    ActionGroupIds extends string = string,
    RecoveryActionGroupId extends string = string
  >(
    id: string
  ): NormalizedRuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  > {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.ruleTypeRegistry.get.missingRuleTypeError', {
          defaultMessage: 'Rule type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    /**
     * When we store the RuleTypes in the Map we strip the typing.
     * This means that returning a typed RuleType in `get` is an inherently
     * unsafe operation. Down casting to `unknown` is the only way to achieve this.
     */
    return this.ruleTypes.get(id)! as unknown as NormalizedRuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >;
  }

  public list(): Set<RegistryRuleType> {
    return new Set(
      Array.from(this.ruleTypes).map(
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
            isExportable,
            ruleTaskTimeout,
            defaultScheduleInterval,
            doesSetRecoveryContext,
          },
        ]: [string, UntypedNormalizedRuleType]) => ({
          id,
          name,
          actionGroups,
          recoveryActionGroup,
          defaultActionGroupId,
          actionVariables,
          producer,
          minimumLicenseRequired,
          isExportable,
          ruleTaskTimeout,
          defaultScheduleInterval,
          doesSetRecoveryContext,
          enabledInLicense: !!this.licenseState.getLicenseCheckForRuleType(
            id,
            name,
            minimumLicenseRequired
          ).isValid,
        })
      )
    );
  }
}

function normalizedActionVariables(actionVariables: RuleType['actionVariables']) {
  return {
    context: actionVariables?.context ?? [],
    state: actionVariables?.state ?? [],
    params: actionVariables?.params ?? [],
  };
}

function augmentActionGroupsWithReserved<
  Params extends AlertTypeParams,
  ExtractedParams extends AlertTypeParams,
  State extends AlertTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  ruleType: RuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >
): NormalizedRuleType<
  Params,
  ExtractedParams,
  State,
  InstanceState,
  InstanceContext,
  ActionGroupIds,
  RecoveredActionGroupId | RecoveryActionGroupId
> {
  const reservedActionGroups = getBuiltinActionGroups(ruleType.recoveryActionGroup);
  const { id, actionGroups, recoveryActionGroup } = ruleType;

  const activeActionGroups = new Set<string>(actionGroups.map((item) => item.id));
  const intersectingReservedActionGroups = intersection<string>(
    [...activeActionGroups.values()],
    reservedActionGroups.map((item) => item.id)
  );
  if (recoveryActionGroup && activeActionGroups.has(recoveryActionGroup.id)) {
    throw new Error(
      i18n.translate(
        'xpack.alerting.ruleTypeRegistry.register.customRecoveryActionGroupUsageError',
        {
          defaultMessage:
            'Rule type [id="{id}"] cannot be registered. Action group [{actionGroup}] cannot be used as both a recovery and an active action group.',
          values: {
            actionGroup: recoveryActionGroup.id,
            id,
          },
        }
      )
    );
  } else if (intersectingReservedActionGroups.length > 0) {
    throw new Error(
      i18n.translate('xpack.alerting.ruleTypeRegistry.register.reservedActionGroupUsageError', {
        defaultMessage:
          'Rule type [id="{id}"] cannot be registered. Action groups [{actionGroups}] are reserved by the framework.',
        values: {
          actionGroups: intersectingReservedActionGroups.join(', '),
          id,
        },
      })
    );
  }

  return {
    ...ruleType,
    actionGroups: [...actionGroups, ...reservedActionGroups],
    recoveryActionGroup: recoveryActionGroup ?? RecoveredActionGroup,
  };
}
