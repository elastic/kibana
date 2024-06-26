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
import { Logger } from '@kbn/core/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { stateSchemaByVersion } from '@kbn/alerting-state-types';
import { TaskRunnerFactory } from './task_runner';
import {
  RuleType,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  IRuleTypeAlerts,
} from './types';
import {
  RecoveredActionGroup,
  getBuiltinActionGroups,
  RecoveredActionGroupId,
  ActionGroup,
  validateDurationSchema,
  parseDuration,
  RuleAlertData,
} from '../common';
import { ILicenseState } from './lib/license_state';
import { getRuleTypeFeatureUsageName } from './lib/get_rule_type_feature_usage_name';
import { InMemoryMetrics } from './monitoring';
import { AlertingRulesConfig } from '.';
import { AlertsService } from './alerts_service/alerts_service';
import { getRuleTypeIdValidLegacyConsumers } from './rule_type_registry_deprecated_consumers';
import { AlertingConfig } from './config';

export interface ConstructorOptions {
  config: AlertingConfig;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
  licenseState: ILicenseState;
  licensing: LicensingPluginSetup;
  minimumScheduleInterval: AlertingRulesConfig['minimumScheduleInterval'];
  inMemoryMetrics: InMemoryMetrics;
  alertsService: AlertsService | null;
}

export interface RegistryRuleType
  extends Pick<
    UntypedNormalizedRuleType,
    | 'name'
    | 'actionGroups'
    | 'recoveryActionGroup'
    | 'defaultActionGroupId'
    | 'actionVariables'
    | 'category'
    | 'producer'
    | 'minimumLicenseRequired'
    | 'isExportable'
    | 'ruleTaskTimeout'
    | 'defaultScheduleInterval'
    | 'doesSetRecoveryContext'
    | 'fieldsForAAD'
  > {
  id: string;
  enabledInLicense: boolean;
  hasFieldsForAAD: boolean;
  hasAlertsMappings: boolean;
  validLegacyConsumers: string[];
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
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> = {
  validLegacyConsumers: string[];
  actionGroups: Array<ActionGroup<ActionGroupIds | RecoveryActionGroupId>>;
} & Omit<
  RuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
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
        RecoveryActionGroupId,
        AlertData
      >
    >,
    'recoveryActionGroup'
  >;

export type UntypedNormalizedRuleType = NormalizedRuleType<
  RuleTypeParams,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  string,
  string,
  RuleAlertData
>;

export class RuleTypeRegistry {
  private readonly config: AlertingConfig;
  private readonly logger: Logger;
  private readonly taskManager: TaskManagerSetupContract;
  private readonly ruleTypes: Map<string, UntypedNormalizedRuleType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly licenseState: ILicenseState;
  private readonly minimumScheduleInterval: AlertingRulesConfig['minimumScheduleInterval'];
  private readonly licensing: LicensingPluginSetup;
  private readonly inMemoryMetrics: InMemoryMetrics;
  private readonly alertsService: AlertsService | null;

  constructor({
    config,
    logger,
    taskManager,
    taskRunnerFactory,
    licenseState,
    licensing,
    minimumScheduleInterval,
    inMemoryMetrics,
    alertsService,
  }: ConstructorOptions) {
    this.config = config;
    this.logger = logger;
    this.taskManager = taskManager;
    this.taskRunnerFactory = taskRunnerFactory;
    this.licenseState = licenseState;
    this.licensing = licensing;
    this.minimumScheduleInterval = minimumScheduleInterval;
    this.inMemoryMetrics = inMemoryMetrics;
    this.alertsService = alertsService;
  }

  public has(id: string) {
    return this.ruleTypes.has(id);
  }

  public ensureRuleTypeEnabled(id: string) {
    this.licenseState.ensureLicenseForRuleType(this.get(id));
  }

  public register<
    Params extends RuleTypeParams,
    ExtractedParams extends RuleTypeParams,
    State extends RuleTypeState,
    InstanceState extends AlertInstanceState,
    InstanceContext extends AlertInstanceContext,
    ActionGroupIds extends string,
    RecoveryActionGroupId extends string,
    AlertData extends RuleAlertData
  >(
    ruleType: RuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
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
      const minimumIntervalInMs = parseDuration(this.minimumScheduleInterval.value);
      if (defaultIntervalInMs < minimumIntervalInMs) {
        if (this.minimumScheduleInterval.enforce) {
          this.logger.warn(
            `Rule type "${ruleType.id}" cannot specify a default interval less than the configured minimum of "${this.minimumScheduleInterval.value}". "${this.minimumScheduleInterval.value}" will be used.`
          );
          ruleType.defaultScheduleInterval = this.minimumScheduleInterval.value;
        } else {
          this.logger.warn(
            `Rule type "${ruleType.id}" has a default interval of "${ruleType.defaultScheduleInterval}", which is less than the configured minimum of "${this.minimumScheduleInterval.value}".`
          );
        }
      }
    }

    const normalizedRuleType = augmentActionGroupsWithReserved<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
    >(ruleType, this.config);

    this.ruleTypes.set(
      ruleTypeIdSchema.validate(ruleType.id),
      /** stripping the typing is required in order to store the RuleTypes in a Map */
      normalizedRuleType as unknown as UntypedNormalizedRuleType
    );

    this.taskManager.registerTaskDefinitions({
      [`alerting:${ruleType.id}`]: {
        title: ruleType.name,
        timeout: ruleType.ruleTaskTimeout,
        stateSchemaByVersion,
        createTaskRunner: (context: RunContext) =>
          this.taskRunnerFactory.create<
            Params,
            ExtractedParams,
            State,
            InstanceState,
            InstanceContext,
            ActionGroupIds,
            RecoveryActionGroupId | RecoveredActionGroupId,
            AlertData
          >(normalizedRuleType, context, this.inMemoryMetrics),
        paramsSchema: schema.object({
          alertId: schema.string(),
          spaceId: schema.string(),
          consumer: schema.maybe(schema.string()),
        }),
      },
    });

    if (this.alertsService && ruleType.alerts) {
      this.alertsService.register(ruleType.alerts as IRuleTypeAlerts);
    }

    // No need to notify usage on basic alert types
    if (ruleType.minimumLicenseRequired !== 'basic') {
      this.licensing.featureUsage.register(
        getRuleTypeFeatureUsageName(ruleType.name),
        ruleType.minimumLicenseRequired
      );
    }
  }

  public get<
    Params extends RuleTypeParams = RuleTypeParams,
    ExtractedParams extends RuleTypeParams = RuleTypeParams,
    State extends RuleTypeState = RuleTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext,
    ActionGroupIds extends string = string,
    RecoveryActionGroupId extends string = string,
    AlertData extends RuleAlertData = RuleAlertData
  >(
    id: string
  ): NormalizedRuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
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
      RecoveryActionGroupId,
      AlertData
    >;
  }

  public list(): Set<RegistryRuleType> {
    const mapRuleTypes: Array<[string, UntypedNormalizedRuleType]> = Array.from(this.ruleTypes);
    const tempRegistryRuleType = mapRuleTypes.map<RegistryRuleType>(
      ([
        id,
        {
          name,
          actionGroups,
          recoveryActionGroup,
          defaultActionGroupId,
          actionVariables,
          category,
          producer,
          minimumLicenseRequired,
          isExportable,
          ruleTaskTimeout,
          defaultScheduleInterval,
          doesSetRecoveryContext,
          alerts,
          fieldsForAAD,
          validLegacyConsumers,
        },
      ]) => {
        // KEEP the type here to be safe if not the map is  ignoring it for some reason
        const ruleType: RegistryRuleType = {
          id,
          name,
          actionGroups,
          recoveryActionGroup,
          defaultActionGroupId,
          actionVariables,
          category,
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
          fieldsForAAD,
          hasFieldsForAAD: Boolean(fieldsForAAD),
          hasAlertsMappings: !!alerts,
          validLegacyConsumers,
          ...(alerts ? { alerts } : {}),
        };
        return ruleType;
      }
    );
    return new Set(tempRegistryRuleType);
  }

  public getAllTypes(): string[] {
    return [...this.ruleTypes.keys()];
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
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
>(
  ruleType: RuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >,
  config: AlertingConfig
): NormalizedRuleType<
  Params,
  ExtractedParams,
  State,
  InstanceState,
  InstanceContext,
  ActionGroupIds,
  RecoveredActionGroupId | RecoveryActionGroupId,
  AlertData
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

  const activeActionGroupSeverities = new Set<number>();
  actionGroups.forEach((actionGroup) => {
    if (!!actionGroup.severity) {
      if (activeActionGroupSeverities.has(actionGroup.severity.level)) {
        throw new Error(
          i18n.translate(
            'xpack.alerting.ruleTypeRegistry.register.duplicateActionGroupSeverityError',
            {
              defaultMessage:
                'Rule type [id="{id}"] cannot be registered. Action group definitions cannot contain duplicate severity levels.',
              values: {
                id,
              },
            }
          )
        );
      }
      activeActionGroupSeverities.add(actionGroup.severity.level);
    }
  });

  return {
    ...ruleType,
    ...(config?.rules?.overwriteProducer ? { producer: config.rules.overwriteProducer } : {}),
    actionGroups: [...actionGroups, ...reservedActionGroups],
    recoveryActionGroup: recoveryActionGroup ?? RecoveredActionGroup,
    validLegacyConsumers: getRuleTypeIdValidLegacyConsumers(id),
  };
}
