/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultLastRun } from '../lib/last_run';
import { AlertsCount, PublicLastRunSetters, RuleLastRun, RuleLastRunOutcomes } from '../types';

export class RuleLastRunService {
  private lastRun: RuleLastRun = getDefaultLastRun();
  private shouldOverrideFrameworkLastRun: boolean = false;

  public getLastRun(): RuleLastRun {
    return this.lastRun;
  }

  public getLastRunSetters(): PublicLastRunSetters {
    return {
      setLastRunOutcome: this.setLastRunOutcome.bind(this),
      setLastRunOutcomeMsg: this.setLastRunOutcomeMsg.bind(this),
      setLastRunWarning: this.setLastRunWarning.bind(this),
      setLastRunAlertsCountActive: this.setLastRunAlertsCountActive.bind(this),
      setLastRunAlertsCountNew: this.setLastRunAlertsCountNew.bind(this),
      setLastRunAlertsCountRecovered: this.setLastRunAlertsCountRecovered.bind(this),
      setLastRunAlertsCountIgnored: this.setLastRunAlertsCountIgnored.bind(this),
      setShouldOverrideFrameworkLastRun: this.setShouldOverrideFrameworkLastRun.bind(this),
    };
  }

  public setShouldOverrideFrameworkLastRun(shouldOverride: boolean) {
    this.shouldOverrideFrameworkLastRun = shouldOverride;
  }

  public getShouldOverrideFrameworkLastRun(): boolean {
    return this.shouldOverrideFrameworkLastRun;
  }

  private setLastRunOutcome(outcome: RuleLastRunOutcomes) {
    this.lastRun.outcome = outcome;
  }

  private setLastRunOutcomeMsg(outcomeMsg: string) {
    this.lastRun.outcomeMsg = outcomeMsg;
  }

  private setLastRunWarning(warning: RuleLastRun['warning']) {
    this.lastRun.warning = warning;
  }

  private setLastRunAlertsCountActive(active: AlertsCount['active']) {
    this.lastRun.alertsCount.active = active;
  }

  private setLastRunAlertsCountNew(newAlerts: AlertsCount['new']) {
    this.lastRun.alertsCount.new = newAlerts;
  }

  private setLastRunAlertsCountRecovered(recovered: AlertsCount['recovered']) {
    this.lastRun.alertsCount.recovered = recovered;
  }

  private setLastRunAlertsCountIgnored(ignored: AlertsCount['ignored']) {
    this.lastRun.alertsCount.ignored = ignored;
  }
}
