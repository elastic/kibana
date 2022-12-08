/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicLastRunSetters, RuleExecutionStatusWarningReasons, RuleLastRun } from '../types';
import { RuleLastRunService } from './rule_last_run_service';

describe('RuleLastRunService', () => {
  let ruleLastRunService: RuleLastRunService;
  let lastRun: RuleLastRun;
  let lastRunSetters: PublicLastRunSetters;

  beforeEach(() => {
    ruleLastRunService = new RuleLastRunService();
    lastRun = ruleLastRunService.getLastRun();
    lastRunSetters = ruleLastRunService.getLastRunSetters();
  });

  test('should return default last run', () => {
    expect(lastRun).toEqual({
      warning: null,
      outcome: 'unknown',
      outcomeMsg: null,
      alertsCount: {
        active: null,
        new: null,
        recovered: null,
        ignored: null,
      },
    });
  });

  test('should set last run outcome', () => {
    lastRunSetters.setLastRunOutcome('succeeded');
    expect(lastRun.outcome).toEqual('succeeded');
  });

  test('should set last run outcome message', () => {
    const outcomeMsg = 'This is a test outcome message';
    lastRunSetters.setLastRunOutcomeMsg(outcomeMsg);
    expect(lastRun.outcomeMsg).toEqual(outcomeMsg);
  });

  test('should set last run warning', () => {
    lastRunSetters.setLastRunWarning(RuleExecutionStatusWarningReasons.MAX_ALERTS);
    expect(lastRun.warning).toEqual(RuleExecutionStatusWarningReasons.MAX_ALERTS);
  });

  test('should set last run active alerts count', () => {
    lastRunSetters.setLastRunAlertsCountActive(1);
    expect(lastRun.alertsCount.active).toEqual(1);
  });

  test('should set last run new alerts count', () => {
    lastRunSetters.setLastRunAlertsCountNew(2);
    expect(lastRun.alertsCount.new).toEqual(2);
  });

  test('should set last run recovered alerts count', () => {
    lastRunSetters.setLastRunAlertsCountRecovered(3);
    expect(lastRun.alertsCount.recovered).toEqual(3);
  });

  test('should set last run ignored alerts count', () => {
    lastRunSetters.setLastRunAlertsCountIgnored(4);
    expect(lastRun.alertsCount.ignored).toEqual(4);
  });

  test('should set should override framework last run', () => {
    ruleLastRunService.setShouldOverrideFrameworkLastRun(true);
    expect(ruleLastRunService.getShouldOverrideFrameworkLastRun()).toEqual(true);
  });
});
