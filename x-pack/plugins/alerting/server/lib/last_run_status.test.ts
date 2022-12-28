/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastRunFromState } from './last_run_status';
import { ActionsCompletion } from '../../common';
import { RuleRunMetrics } from './rule_run_metrics_store';
import { RuleResultServiceResults, RuleResultService } from '../monitoring/rule_result_service';

const getMetrics = ({
  hasReachedAlertLimit = false,
  triggeredActionsStatus = ActionsCompletion.COMPLETE,
}): RuleRunMetrics => {
  return {
    triggeredActionsStatus,
    esSearchDurationMs: 3,
    numSearches: 1,
    numberOfActiveAlerts: 10,
    numberOfGeneratedActions: 15,
    numberOfNewAlerts: 12,
    numberOfRecoveredAlerts: 11,
    numberOfTriggeredActions: 5,
    totalSearchDurationMs: 2,
    hasReachedAlertLimit,
  };
};

const getRuleResultService = ({
  errors = [],
  warnings = [],
  outcomeMessage = '',
}: Partial<RuleResultServiceResults>) => {
  const ruleResultService = new RuleResultService();
  const { addLastRunError, addLastRunWarning, setLastRunOutcomeMessage } =
    ruleResultService.getLastRunSetters();
  errors.forEach((error) => addLastRunError(error));
  warnings.forEach((warning) => addLastRunWarning(warning));
  setLastRunOutcomeMessage(outcomeMessage);
  return ruleResultService;
};

describe('lastRunFromState', () => {
  it('returns successful outcome if no errors or warnings reported', () => {
    const result = lastRunFromState(
      { metrics: getMetrics({}) },
      getRuleResultService({ outcomeMessage: 'Rule executed succesfully' })
    );

    expect(result.lastRun.outcome).toEqual('succeeded');
    expect(result.lastRun.outcomeMsg).toEqual(['Rule executed succesfully']);
    expect(result.lastRun.warning).toEqual(null);

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });

  it('returns a warning outcome if rules last execution reported one', () => {
    const result = lastRunFromState(
      { metrics: getMetrics({}) },
      getRuleResultService({
        warnings: ['MOCK_WARNING'],
        outcomeMessage: 'Rule execution reported a warning',
      })
    );

    expect(result.lastRun.outcome).toEqual('warning');
    expect(result.lastRun.outcomeMsg).toEqual([
      'MOCK_WARNING',
      'Rule execution reported a warning',
    ]);
    expect(result.lastRun.warning).toEqual(null);

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });

  it('returns warning if rule has reached alert limit and alert circuit breaker opens', () => {
    const result = lastRunFromState(
      {
        metrics: getMetrics({ hasReachedAlertLimit: true }),
      },
      getRuleResultService({})
    );

    expect(result.lastRun.outcome).toEqual('warning');
    expect(result.lastRun.outcomeMsg).toEqual([
      'Rule reported more than the maximum number of alerts in a single run. Alerts may be missed and recovery notifications may be delayed',
    ]);
    expect(result.lastRun.warning).toEqual('maxAlerts');

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });

  it('returns warning if rules actions completition is partial and action circuit breaker opens', () => {
    const result = lastRunFromState(
      {
        metrics: getMetrics({ triggeredActionsStatus: ActionsCompletion.PARTIAL }),
      },
      getRuleResultService({})
    );

    expect(result.lastRun.outcome).toEqual('warning');
    expect(result.lastRun.outcomeMsg).toEqual([
      'The maximum number of actions for this rule type was reached; excess actions were not triggered.',
    ]);
    expect(result.lastRun.warning).toEqual('maxExecutableActions');

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });

  it('overwrites rule execution warning if rule has reached alert limit; outcome messages are merged', () => {
    const ruleExecutionOutcomeMessage = 'Rule execution reported a warning';
    const frameworkOutcomeMessage =
      'Rule reported more than the maximum number of alerts in a single run. Alerts may be missed and recovery notifications may be delayed';
    const result = lastRunFromState(
      {
        metrics: getMetrics({ hasReachedAlertLimit: true }),
      },
      getRuleResultService({
        warnings: ['MOCK_WARNING'],
        outcomeMessage: ruleExecutionOutcomeMessage,
      })
    );

    expect(result.lastRun.outcome).toEqual('warning');
    expect(result.lastRun.outcomeMsg).toEqual([
      'MOCK_WARNING',
      frameworkOutcomeMessage,
      ruleExecutionOutcomeMessage,
    ]);
    expect(result.lastRun.warning).toEqual('maxAlerts');

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });

  it('overwrites rule execution warning if rule has reached action limit; outcome messages are merged', () => {
    const ruleExecutionOutcomeMessage = 'Rule execution reported a warning';
    const frameworkOutcomeMessage =
      'The maximum number of actions for this rule type was reached; excess actions were not triggered.';
    const result = lastRunFromState(
      {
        metrics: getMetrics({ triggeredActionsStatus: ActionsCompletion.PARTIAL }),
      },
      getRuleResultService({
        warnings: ['MOCK_WARNING'],
        outcomeMessage: 'Rule execution reported a warning',
      })
    );

    expect(result.lastRun.outcome).toEqual('warning');
    expect(result.lastRun.outcomeMsg).toEqual([
      'MOCK_WARNING',
      frameworkOutcomeMessage,
      ruleExecutionOutcomeMessage,
    ]);
    expect(result.lastRun.warning).toEqual('maxExecutableActions');

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });

  it('overwrites warning outcome to error if rule execution reports an error', () => {
    const result = lastRunFromState(
      {
        metrics: getMetrics({ hasReachedAlertLimit: true }),
      },
      getRuleResultService({
        errors: ['MOCK_ERROR'],
        outcomeMessage: 'Rule execution reported an error',
      })
    );

    expect(result.lastRun.outcome).toEqual('failed');
    expect(result.lastRun.outcomeMsg).toEqual([
      'Rule reported more than the maximum number of alerts in a single run. Alerts may be missed and recovery notifications may be delayed',
      'MOCK_ERROR',
      'Rule execution reported an error',
    ]);
    expect(result.lastRun.warning).toEqual('maxAlerts');

    expect(result.lastRun.alertsCount).toEqual({
      active: 10,
      new: 12,
      recovered: 11,
      ignored: 0,
    });
  });
});
