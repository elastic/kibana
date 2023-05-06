/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { cloneDeep, keys, merge } from 'lodash';
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
  RuleTypeState,
} from '../types';
import { RulesSettingsFlappingProperties } from '../../common/rules_settings';

export interface ProcessAndLogAlertsOpts {
  eventLogger: AlertingEventLogger;
  shouldLogAlerts: boolean;
  ruleRunMetricsStore: RuleRunMetricsStore;
  flappingSettings: RulesSettingsFlappingProperties;
  notifyWhen: RuleNotifyWhenType | null;
  maintenanceWindowIds?: string[];
}

export interface IAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  initialize(
    activeAlertsFromState: Record<string, RawAlertInstance>,
    recoveredAlertsFromState: Record<string, RawAlertInstance>
  ): Promise<void>;
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

export interface LegacyAlertsClientParams {
  logger: Logger;
  maxAlerts: number;
  ruleType: UntypedNormalizedRuleType;
  ruleLabel: string;
  ruleTypeState: RuleTypeState;
}

export class LegacyAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> implements IAlertsClient<State, Context, ActionGroupIds, RecoveryActionGroupId>
{
  private ruleLogPrefix: string;

  // Alerts from the previous execution that are deserialized from the task state
  private trackedAlerts: {
    active: Record<string, Alert<State, Context>>;
    recovered: Record<string, Alert<State, Context>>;
  } = {
    active: {},
    recovered: {},
  };

  // Alerts reported from the rule executor using the alert factory
  private reportedAlerts: Record<string, Alert<State, Context>> = {};

  private processedAlerts: {
    new: Record<string, Alert<State, Context, ActionGroupIds>>;
    active: Record<string, Alert<State, Context, ActionGroupIds>>;
    activeCurrent: Record<string, Alert<State, Context, ActionGroupIds>>;
    recovered: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
    recoveredCurrent: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  };

  private alertFactory?: AlertFactory<
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;

  constructor(private readonly options: LegacyAlertsClientParams) {
    this.ruleLogPrefix = options.ruleLabel;
    this.processedAlerts = {
      new: {},
      active: {},
      activeCurrent: {},
      recovered: {},
      recoveredCurrent: {},
    };
  }

  public async initialize(
    activeAlertsFromState: Record<string, RawAlertInstance>,
    recoveredAlertsFromState: Record<string, RawAlertInstance>,
    maintenanceWindowIds: string[]
  ) {
    for (const id of keys(activeAlertsFromState)) {
      this.trackedAlerts.active[id] = new Alert<State, Context>(id, activeAlertsFromState[id]);
    }

    for (const id of keys(recoveredAlertsFromState)) {
      this.trackedAlerts.recovered[id] = new Alert<State, Context>(
        id,
        recoveredAlertsFromState[id]
      );
    }

    // Legacy alerts client creates a copy of the active tracked alerts
    // This copy is updated when rule executors report alerts back to the framework
    // while the original alert is preserved
    this.reportedAlerts = cloneDeep(this.trackedAlerts.active);

    this.alertFactory = createAlertFactory<
      State,
      Context,
      WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
    >({
      alerts: this.reportedAlerts,
      logger: this.options.logger,
      maxAlerts: this.options.maxAlerts,
      autoRecoverAlerts: this.options.ruleType.autoRecoverAlerts ?? true,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      maintenanceWindowIds,
    });
  }

  public getTrackedAlerts() {
    return this.trackedAlerts;
  }

  public processAndLogAlerts({
    eventLogger,
    ruleRunMetricsStore,
    shouldLogAlerts,
    flappingSettings,
    notifyWhen,
    maintenanceWindowIds,
  }: ProcessAndLogAlertsOpts) {
    const {
      newAlerts: processedAlertsNew,
      activeAlerts: processedAlertsActive,
      currentRecoveredAlerts: processedAlertsRecoveredCurrent,
      recoveredAlerts: processedAlertsRecovered,
    } = processAlerts<State, Context, ActionGroupIds, RecoveryActionGroupId>({
      alerts: this.reportedAlerts,
      existingAlerts: this.trackedAlerts.active,
      previouslyRecoveredAlerts: this.trackedAlerts.recovered,
      hasReachedAlertLimit: this.alertFactory!.hasReachedAlertLimit(),
      alertLimit: this.options.maxAlerts,
      autoRecoverAlerts:
        this.options.ruleType.autoRecoverAlerts !== undefined
          ? this.options.ruleType.autoRecoverAlerts
          : true,
      flappingSettings,
      maintenanceWindowIds,
    });

    const { trimmedAlertsRecovered, earlyRecoveredAlerts } = trimRecoveredAlerts(
      this.options.logger,
      processedAlertsRecovered,
      this.options.maxAlerts
    );

    const alerts = getAlertsForNotification<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      flappingSettings,
      notifyWhen,
      this.options.ruleType.defaultActionGroupId,
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
      ruleLogPrefix: this.ruleLogPrefix,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: shouldLogAlerts,
      maintenanceWindowIds,
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
