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
  RuleTypeState,
  AlertInstanceContext,
  AlertInstanceState,
  RawAlertInstance,
  WithoutReservedActionGroups,
} from '../types';

export interface ProcessAndLogAlertsOpts {
  eventLogger: AlertingEventLogger;
  shouldLogAlerts: boolean;
  ruleRunMetricsStore: RuleRunMetricsStore;
}

export interface IAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  /**
   * Returns whether the alert limit has been hit
   */
  hasReachedAlertLimit(): boolean;
  checkLimitUsage(): void;
  processAndLogAlerts(opts: ProcessAndLogAlertsOpts): void;
  getProcessedAlerts(
    type: 'new' | 'active' | 'recovered' | 'recoveredCurrent'
  ): Record<string, Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>>;
  getAlertsToSerialize(): Promise<{
    alertsToReturn: Record<string, RawAlertInstance>;
    recoveredAlertsToReturn: Record<string, RawAlertInstance>;
  }>;
}

interface TrackedAlertsWithUuid {
  alertId: string;
  alertUuid: string;
}

interface ConstructorOpts {
  logger: Logger;
  maxAlerts: number;
  ruleType: UntypedNormalizedRuleType;
  ruleLabel: string;
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
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
  private trackedAlerts: {
    active: Record<string, Alert<State, Context>>;
    recovered: Record<string, Alert<State, Context>>;
  } = {
    active: {},
    recovered: {},
  };

  private reportedAlerts: Record<string, Alert<State, Context>> = {};
  private processedAlerts: {
    new: Record<string, Alert<State, Context, ActionGroupIds>>;
    active: Record<string, Alert<State, Context, ActionGroupIds>>;
    recovered: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
    recoveredCurrent: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  };

  private alertFactory?: AlertFactory<
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;

  constructor(private readonly options: ConstructorOpts) {
    this.processedAlerts = {
      new: {},
      active: {},
      recovered: {},
      recoveredCurrent: {},
    };
    this.ruleLogPrefix = options.ruleLabel;

    // Tracked alerts are managed by the rule registry lifecycle executor
    // and contain alert UUIDs that we want to maintain for existing
    // active alerts
    const trackedAlerts =
      (options.ruleTypeState?.trackedAlerts as Record<string, TrackedAlertsWithUuid>) ?? {};

    for (const id of keys(options.activeAlertsFromState)) {
      // Use UUID if it exists, otherwise look for this alert in the tracked alerts and copy over UUID if it exists
      const existingUuid = options.activeAlertsFromState[id]?.meta?.uuid;
      const uuid = existingUuid
        ? existingUuid
        : trackedAlerts[id]
        ? trackedAlerts[id].alertUuid
        : undefined;

      this.trackedAlerts.active[id] = new Alert<State, Context>(id, {
        ...options.activeAlertsFromState[id],
        meta: { ...options.activeAlertsFromState[id].meta, uuid },
      });
    }

    for (const id of keys(options.recoveredAlertsFromState)) {
      this.trackedAlerts.recovered[id] = new Alert<State, Context>(
        id,
        options.recoveredAlertsFromState[id]
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
    });
  }

  public getTrackedAlerts() {
    return this.trackedAlerts;
  }

  public processAndLogAlerts({
    eventLogger,
    ruleRunMetricsStore,
    shouldLogAlerts,
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
      setFlapping: true,
    });

    setFlapping<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      processedAlertsActive,
      processedAlertsRecovered
    );

    const { trimmedAlertsRecovered, earlyRecoveredAlerts } = trimRecoveredAlerts(
      this.options.logger,
      processedAlertsRecovered,
      this.options.maxAlerts
    );

    const alerts = getAlertsForNotification<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      this.options.ruleType.defaultActionGroupId,
      processedAlertsNew,
      processedAlertsActive,
      trimmedAlertsRecovered,
      processedAlertsRecoveredCurrent
    );
    alerts.currentRecoveredAlerts = merge(alerts.currentRecoveredAlerts, earlyRecoveredAlerts);

    this.processedAlerts.new = alerts.newAlerts;
    this.processedAlerts.active = alerts.activeAlerts;
    this.processedAlerts.recovered = alerts.recoveredAlerts;
    this.processedAlerts.recoveredCurrent = alerts.currentRecoveredAlerts;

    logAlerts({
      logger: this.options.logger,
      alertingEventLogger: eventLogger,
      newAlerts: alerts.newAlerts,
      activeAlerts: alerts.activeAlerts,
      recoveredAlerts: alerts.currentRecoveredAlerts,
      ruleLogPrefix: this.ruleLogPrefix,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: shouldLogAlerts,
    });
  }

  public getProcessedAlerts(type: 'new' | 'active' | 'recovered' | 'recoveredCurrent') {
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
}
