/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { cloneDeep, merge } from 'lodash';
import { Alert } from '../alert/alert';
import {
  AlertFactory,
  createAlertFactory,
  getPublicAlertFactory,
} from '../alert/create_alert_factory';
import {
  determineAlertsToReturn,
  processAlerts,
  setFlapping,
  getAlertsForNotification,
} from '../lib';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { trimRecoveredAlerts } from '../lib/trim_recovered_alerts';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { logAlerts } from '../task_runner/log_alerts';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RawAlertInstance,
  WithoutReservedActionGroups,
  RuleNotifyWhenType,
} from '../types';
import {
  DEFAULT_FLAPPING_SETTINGS,
  RulesSettingsFlappingProperties,
} from '../../common/rules_settings';
import { DEFAULT_MAX_ALERTS } from '../config';

export interface LegacyAlertsClientParams {
  logger: Logger;
}

export interface InitializeExecutionOpts {
  maxAlerts: number;
  ruleType: UntypedNormalizedRuleType;
  ruleLabel: string;
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
  maintenanceWindowIds: string[];
}

export interface ProcessAndLogAlertsOpts {
  eventLogger?: AlertingEventLogger;
  shouldLogAlerts: boolean;
  ruleRunMetricsStore?: RuleRunMetricsStore;
  flappingSettings?: RulesSettingsFlappingProperties;
  notifyWhen?: RuleNotifyWhenType | null;
  maintenanceWindowIds?: string[];
}

export interface IAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  initializeExecution(opts: InitializeExecutionOpts): Promise<void>;
  hasReachedAlertLimit(): boolean;
  checkLimitUsage(): void;
  processAndLogAlerts(opts: ProcessAndLogAlertsOpts): void;
  getProcessedAlerts(
    type: 'new' | 'active' | 'activeCurrent' | 'recovered' | 'recoveredCurrent'
  ): Record<string, Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>>;
  getAlertsToSerialize(): Promise<{
    alertsToReturn: Record<string, RawAlertInstance>;
    recoveredAlertsToReturn: Record<string, RawAlertInstance>;
  }>;
  setFlapping(flappingSettings: RulesSettingsFlappingProperties): void;
}

export type UntypedAlertsClient = IAlertsClient<
  AlertInstanceState,
  AlertInstanceContext,
  string,
  string
>;

export class LegacyAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  private activeAlertsFromPreviousExecution: Record<string, Alert<State, Context>>;
  private recoveredAlertsFromPreviousExecution: Record<string, Alert<State, Context>>;
  private alerts: Record<string, Alert<State, Context>>;
  private processedAlerts: {
    new: Record<string, Alert<State, Context, ActionGroupIds>>;
    active: Record<string, Alert<State, Context, ActionGroupIds>>;
    activeCurrent: Record<string, Alert<State, Context, ActionGroupIds>>;
    recovered: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
    recoveredCurrent: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  };

  private maxAlerts: number = DEFAULT_MAX_ALERTS;
  private autoRecoverAlerts: boolean = true;
  private doesSetRecoveryContext: boolean = false;
  private defaultActionGroupId: string = '';
  private ruleLabel: string = '';
  private alertFactory?: AlertFactory<
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;
  constructor(private readonly options: LegacyAlertsClientParams) {
    this.alerts = {};
    this.activeAlertsFromPreviousExecution = {};
    this.recoveredAlertsFromPreviousExecution = {};
    this.processedAlerts = {
      new: {},
      active: {},
      activeCurrent: {},
      recovered: {},
      recoveredCurrent: {},
    };
  }

  public initializeExecution({
    maxAlerts,
    ruleType,
    ruleLabel,
    activeAlertsFromState,
    recoveredAlertsFromState,
    maintenanceWindowIds,
  }: InitializeExecutionOpts) {
    this.maxAlerts = maxAlerts;
    this.autoRecoverAlerts =
      ruleType.autoRecoverAlerts !== undefined ? ruleType.autoRecoverAlerts : true;
    this.doesSetRecoveryContext = ruleType.doesSetRecoveryContext ?? false;
    this.defaultActionGroupId = ruleType.defaultActionGroupId;
    this.ruleLabel = ruleLabel;

    for (const id in activeAlertsFromState) {
      if (activeAlertsFromState.hasOwnProperty(id)) {
        this.activeAlertsFromPreviousExecution[id] = new Alert<State, Context>(
          id,
          activeAlertsFromState[id]
        );
      }
    }

    for (const id in recoveredAlertsFromState) {
      if (recoveredAlertsFromState.hasOwnProperty(id)) {
        this.recoveredAlertsFromPreviousExecution[id] = new Alert<State, Context>(
          id,
          recoveredAlertsFromState[id]
        );
      }
    }

    this.alerts = cloneDeep(this.activeAlertsFromPreviousExecution);

    this.alertFactory = createAlertFactory<
      State,
      Context,
      WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
    >({
      alerts: this.alerts,
      logger: this.options.logger,
      maxAlerts,
      autoRecoverAlerts: this.autoRecoverAlerts,
      canSetRecoveryContext: this.doesSetRecoveryContext,
      maintenanceWindowIds,
    });
  }

  public processAndLogAlerts({
    eventLogger,
    ruleRunMetricsStore,
    shouldLogAlerts,
    flappingSettings = DEFAULT_FLAPPING_SETTINGS,
    notifyWhen = null,
    maintenanceWindowIds = [],
  }: ProcessAndLogAlertsOpts) {
    const {
      newAlerts: processedAlertsNew,
      activeAlerts: processedAlertsActive,
      currentRecoveredAlerts: processedAlertsRecoveredCurrent,
      recoveredAlerts: processedAlertsRecovered,
    } = processAlerts<State, Context, ActionGroupIds, RecoveryActionGroupId>({
      alerts: this.alerts,
      existingAlerts: this.activeAlertsFromPreviousExecution,
      previouslyRecoveredAlerts: this.recoveredAlertsFromPreviousExecution,
      hasReachedAlertLimit: this.alertFactory!.hasReachedAlertLimit(),
      alertLimit: this.maxAlerts,
      autoRecoverAlerts: this.autoRecoverAlerts,
      flappingSettings,
      maintenanceWindowIds,
    });

    const { trimmedAlertsRecovered, earlyRecoveredAlerts } = trimRecoveredAlerts(
      this.options.logger,
      processedAlertsRecovered,
      this.maxAlerts
    );

    const alerts = getAlertsForNotification<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      flappingSettings,
      notifyWhen,
      this.defaultActionGroupId,
      processedAlertsNew,
      processedAlertsActive,
      trimmedAlertsRecovered,
      processedAlertsRecoveredCurrent
    );
    alerts.currentRecoveredAlerts = merge(alerts.currentRecoveredAlerts, earlyRecoveredAlerts);

    this.processedAlerts.new = alerts.newAlerts;
    this.processedAlerts.active = alerts.activeAlerts;
    this.processedAlerts.activeCurrent = alerts.currentActiveAlerts;
    this.processedAlerts.recovered = alerts.recoveredAlerts;
    this.processedAlerts.recoveredCurrent = alerts.currentRecoveredAlerts;

    logAlerts({
      logger: this.options.logger,
      alertingEventLogger: eventLogger,
      newAlerts: alerts.newAlerts,
      activeAlerts: alerts.currentActiveAlerts,
      recoveredAlerts: alerts.currentRecoveredAlerts,
      ruleLogPrefix: this.ruleLabel,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.doesSetRecoveryContext,
      shouldPersistAlerts: shouldLogAlerts,
    });
  }

  public getProcessedAlerts(
    type: 'new' | 'active' | 'activeCurrent' | 'recovered' | 'recoveredCurrent'
  ) {
    if (this.processedAlerts.hasOwnProperty(type)) {
      return this.processedAlerts[type];
    }

    return {};
  }

  public async getAlertsToSerialize() {
    return determineAlertsToReturn<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      this.processedAlerts.active,
      this.processedAlerts.recovered
    );
  }

  public hasReachedAlertLimit(): boolean {
    return this.alertFactory!.hasReachedAlertLimit();
  }

  public checkLimitUsage() {
    return this.alertFactory!.alertLimit.checkLimitUsage();
  }

  public getExecutorServices() {
    return getPublicAlertFactory(this.alertFactory!);
  }

  public setFlapping(flappingSettings: RulesSettingsFlappingProperties) {
    setFlapping<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      flappingSettings,
      this.processedAlerts.active,
      this.processedAlerts.recovered
    );
  }
}
