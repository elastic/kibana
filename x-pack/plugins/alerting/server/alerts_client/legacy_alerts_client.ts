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
import { trimRecoveredAlerts } from '../lib/trim_recovered_alerts';
import { logAlerts } from '../task_runner/log_alerts';
import { AlertInstanceContext, AlertInstanceState, WithoutReservedActionGroups } from '../types';
import { MaintenanceWindow } from '../application/maintenance_window/types';
import {
  DEFAULT_FLAPPING_SETTINGS,
  RulesSettingsFlappingProperties,
} from '../../common/rules_settings';
import {
  IAlertsClient,
  InitializeExecutionOpts,
  ProcessAndLogAlertsOpts,
  ProcessAlertsOpts,
  LogAlertsOpts,
  TrackedAlerts,
} from './types';
import { DEFAULT_MAX_ALERTS } from '../config';
import { UntypedNormalizedRuleType } from '../rule_type_registry';

export interface LegacyAlertsClientParams {
  logger: Logger;
  ruleType: UntypedNormalizedRuleType;
}

export class LegacyAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> implements IAlertsClient<{}, State, Context, ActionGroupIds, RecoveryActionGroupId>
{
  private maxAlerts: number = DEFAULT_MAX_ALERTS;
  private flappingSettings: RulesSettingsFlappingProperties = DEFAULT_FLAPPING_SETTINGS;
  private ruleLogPrefix: string = '';
  private startedAtString: string | null = null;

  // Alerts from the previous execution that are deserialized from the task state
  private trackedAlerts: TrackedAlerts<State, Context> = {
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
    this.processedAlerts = {
      new: {},
      active: {},
      activeCurrent: {},
      recovered: {},
      recoveredCurrent: {},
    };
  }

  public async initializeExecution({
    maxAlerts,
    ruleLabel,
    startedAt,
    flappingSettings,
    activeAlertsFromState,
    recoveredAlertsFromState,
  }: InitializeExecutionOpts) {
    this.maxAlerts = maxAlerts;
    this.flappingSettings = flappingSettings;
    this.ruleLogPrefix = ruleLabel;
    this.startedAtString = startedAt ? startedAt.toISOString() : null;

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
      maxAlerts: this.maxAlerts,
      autoRecoverAlerts: this.options.ruleType.autoRecoverAlerts ?? true,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
    });
  }

  public getTrackedAlerts() {
    return this.trackedAlerts;
  }

  public getAlert(id: string) {
    return this.alertFactory?.get(id);
  }

  public isTrackedAlert(id: string) {
    return !!this.trackedAlerts.active[id];
  }

  public processAlerts({
    notifyOnActionGroupChange,
    flappingSettings,
    maintenanceWindowIds,
    alertDelay,
    ruleRunMetricsStore,
  }: ProcessAlertsOpts) {
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
      alertLimit: this.maxAlerts,
      autoRecoverAlerts: this.options.ruleType.autoRecoverAlerts ?? true,
      flappingSettings,
      maintenanceWindowIds,
      startedAt: this.startedAtString,
    });

    const { trimmedAlertsRecovered, earlyRecoveredAlerts } = trimRecoveredAlerts(
      this.options.logger,
      processedAlertsRecovered,
      this.maxAlerts
    );

    const alerts = getAlertsForNotification<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      flappingSettings,
      notifyOnActionGroupChange,
      this.options.ruleType.defaultActionGroupId,
      alertDelay,
      processedAlertsNew,
      processedAlertsActive,
      trimmedAlertsRecovered,
      processedAlertsRecoveredCurrent,
      this.startedAtString
    );
    ruleRunMetricsStore.setNumberOfDelayedAlerts(alerts.delayedAlertsCount);
    alerts.currentRecoveredAlerts = merge(alerts.currentRecoveredAlerts, earlyRecoveredAlerts);

    this.processedAlerts.new = alerts.newAlerts;
    this.processedAlerts.active = alerts.activeAlerts;
    this.processedAlerts.activeCurrent = alerts.currentActiveAlerts;
    this.processedAlerts.recovered = alerts.recoveredAlerts;
    this.processedAlerts.recoveredCurrent = alerts.currentRecoveredAlerts;
  }

  public logAlerts({ eventLogger, ruleRunMetricsStore, shouldLogAlerts }: LogAlertsOpts) {
    logAlerts({
      logger: this.options.logger,
      alertingEventLogger: eventLogger,
      newAlerts: this.processedAlerts.new,
      activeAlerts: this.processedAlerts.activeCurrent,
      recoveredAlerts: this.processedAlerts.recoveredCurrent,
      ruleLogPrefix: this.ruleLogPrefix,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: shouldLogAlerts,
    });
  }

  public processAndLogAlerts({
    eventLogger,
    ruleRunMetricsStore,
    shouldLogAlerts,
    flappingSettings,
    notifyOnActionGroupChange,
    maintenanceWindowIds,
    alertDelay,
  }: ProcessAndLogAlertsOpts) {
    this.processAlerts({
      notifyOnActionGroupChange,
      flappingSettings,
      maintenanceWindowIds,
      alertDelay,
      ruleRunMetricsStore,
    });

    this.logAlerts({
      eventLogger,
      ruleRunMetricsStore,
      shouldLogAlerts,
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

  public getAlertsToSerialize(shouldSetFlapping: boolean = true) {
    if (shouldSetFlapping) {
      setFlapping<State, Context, ActionGroupIds, RecoveryActionGroupId>(
        this.flappingSettings,
        this.processedAlerts.active,
        this.processedAlerts.recovered
      );
    }
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

  public factory() {
    return getPublicAlertFactory(this.alertFactory!);
  }

  public client() {
    return null;
  }

  public async persistAlerts(maintenanceWindows?: MaintenanceWindow[]) {
    return null;
  }

  public async setAlertStatusToUntracked() {
    return;
  }
}
