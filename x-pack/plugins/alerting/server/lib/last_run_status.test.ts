/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastRunFromState } from './last_run_status';
import { ActionsCompletion } from '../../common';
import { RuleRunMetrics } from './rule_run_metrics_store';
const getMetrics = (): RuleRunMetrics => {
  return {
    triggeredActionsStatus: ActionsCompletion.COMPLETE,
    esSearchDurationMs: 3,
    numSearches: 1,
    numberOfActiveAlerts: 10,
    numberOfGeneratedActions: 15,
    numberOfNewAlerts: 12,
    numberOfRecoveredAlerts: 11,
    numberOfTriggeredActions: 5,
    totalSearchDurationMs: 2,
    hasReachedAlertLimit: false,
  };
};

describe('lastRunFromState', () => {
  it('successfuly outcome', () => {
    const result = lastRunFromState({ metrics: getMetrics() });

    expect(result.lastRun.outcome).toEqual('succeeded');
    expect(result.lastRun.outcomeMsg).toEqual(null);
    expect(result.lastRun.warning).toEqual(null);

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });

  it('limited reached outcome', () => {
    const result = lastRunFromState({
      metrics: {
        ...getMetrics(),
        hasReachedAlertLimit: true,
      },
    });

    expect(result.lastRun.outcome).toEqual('warning');
    expect(result.lastRun.outcomeMsg).toEqual(
      'Rule reported more than the maximum number of alerts in a single run. Alerts may be missed and recovery notifications may be delayed'
    );
    expect(result.lastRun.warning).toEqual('maxAlerts');

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });

  it('partial triggered actions status outcome', () => {
    const result = lastRunFromState({
      metrics: {
        ...getMetrics(),
        triggeredActionsStatus: ActionsCompletion.PARTIAL,
      },
    });

    expect(result.lastRun.outcome).toEqual('warning');
    expect(result.lastRun.outcomeMsg).toEqual(
      'The maximum number of actions for this rule type was reached; excess actions were not triggered.'
    );
    expect(result.lastRun.warning).toEqual('maxExecutableActions');

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });
});
