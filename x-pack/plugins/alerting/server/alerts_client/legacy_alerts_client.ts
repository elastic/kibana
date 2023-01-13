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
import { determineAlertsToReturn, setFlappingLegacy, updateFlappingHistory } from '../lib';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { categorizeAlerts } from '../lib';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { logAlerts } from '../task_runner/log_alerts';
import { AlertInstanceContext, AlertInstanceState, RawAlertInstance } from '../types';
import {
  prepareNewAlerts,
  prepareOngoingAlerts,
  prepareRecoveredAlerts,
  UpdateValuesOpts,
} from '../lib/prepare_alerts';

interface ConstructorOpts {
  logger: Logger;
  maxAlerts: number;
  ruleType: UntypedNormalizedRuleType;
}

export class LegacyAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
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
    new: Record<string, Alert<State, Context>>;
    active: Record<string, Alert<State, Context>>;
    recovered: Record<string, Alert<State, Context>>;
    recoveredCurrent: Record<string, Alert<State, Context>>;
  };

  private alertFactory?: AlertFactory<State, Context, ActionGroupIds>;
  constructor(private readonly options: ConstructorOpts) {
    this.processedAlerts = {
      new: {},
      active: {},
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

    this.reportedAlerts = cloneDeep(this.trackedAlerts.active);

    this.alertFactory = createAlertFactory<State, Context, ActionGroupIds>({
      alerts: this.reportedAlerts,
      logger: this.options.logger,
      maxAlerts: this.options.maxAlerts,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
    });
  }

  public processAndLogAlerts({
    eventLogger,
    ruleLabel,
    ruleRunMetricsStore,
    shouldLogAndScheduleActionsForAlerts,
  }: {
    eventLogger: AlertingEventLogger;
    ruleLabel: string;
    shouldLogAndScheduleActionsForAlerts: boolean;
    ruleRunMetricsStore: RuleRunMetricsStore;
  }) {
    const trackedRecoveredAlertIds = new Set(Object.keys(this.trackedAlerts.recovered));
    const activeAlerts: Record<string, Alert<State, Context>> = {};
    // recovered alerts from current execution + the ones being tracked
    const allRecoveredAlerts: Record<string, Alert<State, Context>> = {};

    const categorized = categorizeAlerts<Alert<State, Context>>({
      reportedAlerts: splitAlerts<State, Context>(this.reportedAlerts, this.trackedAlerts.active),
      trackedAlerts: this.trackedAlerts.active,
      hasReachedAlertLimit: this.alertFactory!.hasReachedAlertLimit(),
      alertLimit: this.options.maxAlerts,
    });

    const updateAlertValues = ({
      alert,
      start,
      duration,
      end,
      flappingHistory,
    }: {
      alert: Alert<State, Context>;
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
    };

    const getStartTimes = (alerts: Record<string, Alert<State, Context>>) =>
      mapValues(alerts, (alert) => {
        const state = alert.getState();
        return state.start as string;
      });

    const getFlappingHistories = (alerts: Record<string, Alert<State, Context>>) =>
      mapValues(alerts, (alert) => alert.getFlappingHistory() ?? []);

    // For alerts categorized as new, set the start time and duration
    // and check to see if it's a flapping alert
    prepareNewAlerts<Alert<State, Context>>(
      categorized.new,
      getFlappingHistories(this.trackedAlerts.recovered),
      (opts: UpdateValuesOpts<Alert<State, Context>>) => {
        updateAlertValues(opts);
        activeAlerts[opts.id] = opts.alert;
      }
    );

    // For alerts categorized as ongoing, update the duration
    prepareOngoingAlerts<Alert<State, Context>>(
      categorized.ongoing,
      getStartTimes(categorized.ongoing),
      getFlappingHistories(categorized.ongoing),
      (opts: UpdateValuesOpts<Alert<State, Context>>) => {
        updateAlertValues(opts);
        activeAlerts[opts.id] = opts.alert;
      }
    );

    // For alerts categorized as recovered, update the duration and set end time
    prepareRecoveredAlerts<Alert<State, Context>>(
      categorized.recovered,
      getStartTimes(categorized.recovered),
      getFlappingHistories(categorized.recovered),
      (opts: UpdateValuesOpts<Alert<State, Context>>) => {
        updateAlertValues(opts);
        allRecoveredAlerts[opts.id] = opts.alert;
      }
    );

    // alerts are still recovered
    for (const id of trackedRecoveredAlertIds) {
      allRecoveredAlerts[id] = this.trackedAlerts.recovered[id];
      const updatedFlappingHistory = updateFlappingHistory(
        allRecoveredAlerts[id].getFlappingHistory() || [],
        false
      );
      allRecoveredAlerts[id].setFlappingHistory(updatedFlappingHistory);
    }

    setFlappingLegacy<State, Context>(activeAlerts, allRecoveredAlerts);

    this.processedAlerts.new = categorized.new;
    this.processedAlerts.active = activeAlerts;
    this.processedAlerts.recovered = allRecoveredAlerts;
    this.processedAlerts.recoveredCurrent = categorized.recovered;

    logAlerts({
      logger: this.options.logger,
      alertingEventLogger: eventLogger,
      newAlerts: this.processedAlerts.new,
      activeAlerts,
      recoveredAlerts: allRecoveredAlerts,
      ruleLogPrefix: ruleLabel,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: shouldLogAndScheduleActionsForAlerts,
    });
  }

  public getProcessedAlerts(type: 'new' | 'active' | 'recovered' | 'recoveredCurrent') {
    if (this.processedAlerts.hasOwnProperty(type)) {
      return this.processedAlerts[type];
    }

    return {};
  }

  public getAlertsToSerialize() {
    return determineAlertsToReturn<State, Context>(
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

export function updateAlertFlappingHistory<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
>(alert: Alert<State, Context>, state: boolean) {
  const updatedFlappingHistory = updateFlappingHistory(alert.getFlappingHistory() || [], state);
  alert.setFlappingHistory(updatedFlappingHistory);
}
