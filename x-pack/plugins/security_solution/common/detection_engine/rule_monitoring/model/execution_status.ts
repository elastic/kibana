/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleLastRunOutcomes } from '@kbn/alerting-plugin/common';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';
import type * as t from 'io-ts';
import { RuleExecutionStatus } from '../../../generated_schema/common_schema.gen';
import { assertUnreachable } from '../../../utility_types';

export type RuleExecutionStatusOrder = t.TypeOf<typeof RuleExecutionStatusOrder>;
export const RuleExecutionStatusOrder = PositiveInteger;

export const ruleExecutionStatusToNumber = (
  status: RuleExecutionStatus
): RuleExecutionStatusOrder => {
  switch (status) {
    case RuleExecutionStatus.enum.succeeded:
      return 0;
    case RuleExecutionStatus.enum['going to run']:
      return 10;
    case RuleExecutionStatus.enum.running:
      return 15;
    case RuleExecutionStatus.enum['partial failure']:
      return 20;
    case RuleExecutionStatus.enum.failed:
      return 30;
    default:
      assertUnreachable(status);
      return 0;
  }
};

export const ruleLastRunOutcomeToExecutionStatus = (
  outcome: RuleLastRunOutcomes
): RuleExecutionStatus => {
  switch (outcome) {
    case 'succeeded':
      return RuleExecutionStatus.enum.succeeded;
    case 'warning':
      return RuleExecutionStatus.enum['partial failure'];
    case 'failed':
      return RuleExecutionStatus.enum.failed;
    default:
      assertUnreachable(outcome);
      return RuleExecutionStatus.enum.failed;
  }
};
