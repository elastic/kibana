/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { cloneDeep, mapValues } from 'lodash';
import { Alert } from '../alert/alert';
import {
  AlertFactory,
  createAlertFactory,
  getPublicAlertFactory,
  splitAlerts,
} from '../alert/create_alert_factory';
import { determineAlertsToReturn, isFlapping, processAlerts } from '../lib';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { logAlerts } from '../task_runner/log_alerts';
import {
  AlertInstanceContext,
  AlertInstanceState,
  LastScheduledActions,
  RawAlertInstance,
  WithoutReservedActionGroups,
} from '../types';
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
  private ruleLogPrefix: string;
  // Alerts that were reported as active or recovered in the previous rule execution
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
    this.ruleLogPrefix = `${this.options.ruleType.id}`;
  }

  public initialize({
    ruleLabel,
    activeAlertsFromState,
    recoveredAlertsFromState,
  }: {
    ruleLabel: string;
    activeAlertsFromState: Record<string, RawAlertInstance>;
    recoveredAlertsFromState: Record<string, RawAlertInstance>;
  }) {
    this.ruleLogPrefix = ruleLabel;
    for (const id in activeAlertsFromState) {
      if (activeAlertsFromState.hasOwnProperty(id)) {
        this.trackedAlerts.active[id] = new Alert<State, Context>(id, activeAlertsFromState[id]);
      }
    }

    for (const id in recoveredAlertsFromState) {
      if (recoveredAlertsFromState.hasOwnProperty(id)) {
        this.trackedAlerts.recovered[id] = new Alert<State, Context>(
          id,
          recoveredAlertsFromState[id]
        );
      }
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
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
    });
  }

  public processAndLogAlerts({
    eventLogger,
    ruleRunMetricsStore,
    shouldLogAlerts,
  }: {
    eventLogger: AlertingEventLogger;
    shouldLogAlerts: boolean;
    ruleRunMetricsStore: RuleRunMetricsStore;
  }) {
    const updateAlertValues = ({
      alert,
      start,
      duration,
      end,
      flappingHistory,
    }: {
      alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>;
      start?: string;
      duration?: string;
      end?: string;
      flappingHistory: boolean[];
    }) => {
      const state = alert.getState();
      alert.replaceState({
        ...state,
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
        ...(duration !== undefined ? { duration } : {}),
      });
      alert.setFlappingHistory(flappingHistory);
      alert.setFlapping(isAlertFlapping(alert));
    };

    const {
      newAlerts: processedAlertsNew,
      activeAlerts: processedAlertsActive,
      currentRecoveredAlerts: processedAlertsRecoveredCurrent,
      recoveredAlerts: processedAlertsRecovered,
    } = processAlerts<Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>>({
      reportedAlerts: splitAlerts<State, Context>(this.reportedAlerts, this.trackedAlerts.active),
      trackedAlerts: this.trackedAlerts,
      hasReachedAlertLimit: this.alertFactory!.hasReachedAlertLimit(),
      alertLimit: this.options.maxAlerts,
      callbacks: {
        getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
        getStartTime: (alert) => {
          const state = alert.getState();
          return state?.start ? (state.start as string) : undefined;
        },
        updateAlertValues,
      },
    });

    this.processedAlerts.new = processedAlertsNew as Record<
      string,
      Alert<State, Context, ActionGroupIds>
    >;
    this.processedAlerts.active = processedAlertsActive as Record<
      string,
      Alert<State, Context, ActionGroupIds>
    >;
    this.processedAlerts.recovered = processedAlertsRecovered as Record<
      string,
      Alert<State, Context, RecoveryActionGroupId>
    >;
    this.processedAlerts.recoveredCurrent = processedAlertsRecoveredCurrent as Record<
      string,
      Alert<State, Context, RecoveryActionGroupId>
    >;

    const getAlertData = (
      alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>
    ) => ({
      actionGroup: alert.getScheduledActionOptions()?.actionGroup,
      hasContext: alert.hasContext(),
      lastScheduledActions: alert.getLastScheduledActions() as LastScheduledActions,
      state: alert.getState(),
      flapping: alert.getFlapping(),
    });

    logAlerts({
      logger: this.options.logger,
      alertingEventLogger: eventLogger,
      newAlerts: mapValues(processedAlertsNew, (alert) => getAlertData(alert)),
      activeAlerts: mapValues(processedAlertsActive, (alert) => getAlertData(alert)),
      recoveredAlerts: mapValues(processedAlertsRecoveredCurrent, (alert) => getAlertData(alert)),
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
}

function isAlertFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
>(alert: Alert<State, Context, ActionGroupIds>): boolean {
  const flappingHistory: boolean[] = alert.getFlappingHistory() || [];
  const isCurrentlyFlapping = alert.getFlapping();
  return isFlapping(flappingHistory, isCurrentlyFlapping);
}
