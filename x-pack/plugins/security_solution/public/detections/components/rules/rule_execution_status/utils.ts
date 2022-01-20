/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';

export const normalizeRuleExecutionStatus = (
  value: RuleExecutionStatus | null | undefined
): RuleExecutionStatus | null =>
  value === RuleExecutionStatus['partial failure']
    ? RuleExecutionStatus.warning
    : value != null
    ? value
    : null;

export const getCapitalizedRuleStatusText = (
  value: RuleExecutionStatus | null | undefined
): string | null => {
  const status = normalizeRuleExecutionStatus(value);
  return status != null ? capitalize(status) : null;
};

export const getStatusColor = (status: RuleExecutionStatus | string | null) =>
  status == null
    ? 'subdued'
    : status === 'succeeded'
    ? 'success'
    : status === 'failed'
    ? 'danger'
    : status === 'executing' ||
      status === 'going to run' ||
      status === 'partial failure' ||
      status === 'warning'
    ? 'warning'
    : 'subdued';
