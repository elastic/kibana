/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Outcome } from 'elastic-apm-node';
import { RuleExecutionStatus, RuleLastRun } from '../../../common';
import { ElasticsearchError } from '../../lib';
import { ILastRun, lastRunFromError, lastRunFromState } from '../../lib/last_run_status';
import { map, Result } from '../../lib/result_type';
import {
  executionStatusFromError,
  executionStatusFromState,
  IExecutionStatusAndMetrics,
} from '../../lib/rule_execution_status';
import { RuleRunMetrics } from '../../lib/rule_run_metrics_store';
import { RuleResultService } from '../../monitoring/rule_result_service';
import { RuleTaskStateAndMetrics } from '../types';

interface ProcessRuleRunOpts {
  logger?: Logger;
  logPrefix?: string;
  result: RuleResultService;
  runDate: Date;
  runResultWithMetrics: Result<RuleTaskStateAndMetrics, Error>;
}

interface ProcessRuleRunResult {
  executionStatus: RuleExecutionStatus;
  executionMetrics: RuleRunMetrics | null;
  lastRun: RuleLastRun;
  outcome: Outcome;
}

export function processRunResults({
  logger,
  logPrefix,
  result,
  runDate,
  runResultWithMetrics,
}: ProcessRuleRunOpts): ProcessRuleRunResult {
  // Getting executionStatus for backwards compatibility
  const { status: executionStatus } = map<
    RuleTaskStateAndMetrics,
    ElasticsearchError,
    IExecutionStatusAndMetrics
  >(
    runResultWithMetrics,
    (ruleRunStateWithMetrics) =>
      executionStatusFromState({
        stateWithMetrics: ruleRunStateWithMetrics,
        lastExecutionDate: runDate,
        ruleResultService: result,
      }),
    (err: ElasticsearchError) => executionStatusFromError(err, runDate)
  );

  // New consolidated statuses for lastRun
  const { lastRun, metrics: executionMetrics } = map<
    RuleTaskStateAndMetrics,
    ElasticsearchError,
    ILastRun
  >(
    runResultWithMetrics,
    (ruleRunStateWithMetrics) => lastRunFromState(ruleRunStateWithMetrics, result),
    (err: ElasticsearchError) => lastRunFromError(err)
  );

  if (logger) {
    logger.debug(`deprecated ruleRunStatus for ${logPrefix}: ${JSON.stringify(executionStatus)}`);
    logger.debug(`ruleRunStatus for ${logPrefix}: ${JSON.stringify(lastRun)}`);
    if (executionMetrics) {
      logger.debug(`ruleRunMetrics for ${logPrefix}: ${JSON.stringify(executionMetrics)}`);
    }
  }

  let outcome: Outcome = 'success';
  if (executionStatus.status === 'ok' || executionStatus.status === 'active') {
    outcome = 'success';
  } else if (executionStatus.status === 'error' || executionStatus.status === 'unknown') {
    outcome = 'failure';
  } else if (lastRun.outcome === 'succeeded') {
    outcome = 'success';
  } else if (lastRun.outcome === 'failed') {
    outcome = 'failure';
  }

  return { executionStatus, executionMetrics, lastRun, outcome };
}
