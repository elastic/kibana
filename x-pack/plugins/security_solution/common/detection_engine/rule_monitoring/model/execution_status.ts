/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import { enumeration, PositiveInteger } from '@kbn/securitysolution-io-ts-types';
import type { RuleLastRunOutcomes } from '@kbn/alerting-plugin/common';
import { assertUnreachable } from '../../../utility_types';

/**
 * Custom execution status of Security rules that is different from the status
 * used in the Alerting Framework. We merge our custom status with the
 * Framework's status to determine the resulting status of a rule.
 */
export enum RuleExecutionStatus {
  /**
   * @deprecated Replaced by the 'running' status but left for backwards compatibility
   * with rule execution events already written to Event Log in the prior versions of Kibana.
   * Don't use when writing rule status changes.
   */
  'going to run' = 'going to run',

  /**
   * Rule execution started but not reached any intermediate or final status.
   */
  'running' = 'running',

  /**
   * Rule can partially fail for various reasons either in the middle of an execution
   * (in this case we update its status right away) or in the end of it. So currently
   * this status can be both intermediate and final at the same time.
   * A typical reason for a partial failure: not all the indices that the rule searches
   * over actually exist.
   */
  'partial failure' = 'partial failure',

  /**
   * Rule failed to execute due to unhandled exception or a reason defined in the
   * business logic of its executor function.
   */
  'failed' = 'failed',

  /**
   * Rule executed successfully without any issues. Note: this status is just an indication
   * of a rule's "health". The rule might or might not generate any alerts despite of it.
   */
  'succeeded' = 'succeeded',
}

export const TRuleExecutionStatus = enumeration('RuleExecutionStatus', RuleExecutionStatus);

/**
 * An array of supported rule execution statuses.
 */
export const RULE_EXECUTION_STATUSES = Object.values(RuleExecutionStatus);

export type RuleExecutionStatusOrder = t.TypeOf<typeof RuleExecutionStatusOrder>;
export const RuleExecutionStatusOrder = PositiveInteger;

export const ruleExecutionStatusToNumber = (
  status: RuleExecutionStatus
): RuleExecutionStatusOrder => {
  switch (status) {
    case RuleExecutionStatus.succeeded:
      return 0;
    case RuleExecutionStatus['going to run']:
      return 10;
    case RuleExecutionStatus.running:
      return 15;
    case RuleExecutionStatus['partial failure']:
      return 20;
    case RuleExecutionStatus.failed:
      return 30;
    default:
      assertUnreachable(status);
      return 0;
  }
};

export const ruleLastRunOutcomeToNumber = (
  outcome: RuleLastRunOutcomes
): RuleExecutionStatusOrder => {
  switch (outcome) {
    case 'succeeded':
      return 0;
    case 'warning':
      return 20;
    case 'failed':
      return 30;
    case 'unknown':
      return 40; // TBC
    default:
      assertUnreachable(outcome);
      return 0;
  }
};
