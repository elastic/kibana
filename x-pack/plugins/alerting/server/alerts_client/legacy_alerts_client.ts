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
import { RulesSettingsFlappingProperties } from '../../common/rules_settings';

interface ConstructorOpts {
  logger: Logger;
  maxAlerts: number;
  ruleType: UntypedNormalizedRuleType;
}

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

  private alertFactory?: AlertFactory<
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;
  constructor(private readonly options: ConstructorOpts) {
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

  public initialize(
    activeAlertsFromState: Record<string, RawAlertInstance>,
    recoveredAlertsFromState: Record<string, RawAlertInstance>
  ) {
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
      maxAlerts: this.options.maxAlerts,
      autoRecoverAlerts: this.options.ruleType.autoRecoverAlerts ?? true,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
    });
  }

  public processAndLogAlerts({
    eventLogger,
    ruleLabel,
    ruleRunMetricsStore,
    shouldLogAndScheduleActionsForAlerts,
    flappingSettings,
    notifyWhen,
  }: {
    eventLogger: AlertingEventLogger;
    ruleLabel: string;
    shouldLogAndScheduleActionsForAlerts: boolean;
    ruleRunMetricsStore: RuleRunMetricsStore;
    flappingSettings: RulesSettingsFlappingProperties;
    notifyWhen: RuleNotifyWhenType | null;
  }) {
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
      alertLimit: this.options.maxAlerts,
      autoRecoverAlerts:
        this.options.ruleType.autoRecoverAlerts !== undefined
          ? this.options.ruleType.autoRecoverAlerts
          : true,
      flappingSettings,
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
      ruleLogPrefix: ruleLabel,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: shouldLogAndScheduleActionsForAlerts,
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

  public getAlertsToSerialize() {
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
