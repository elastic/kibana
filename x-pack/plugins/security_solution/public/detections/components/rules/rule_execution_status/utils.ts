/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IconColor } from '@elastic/eui';
import { capitalize } from 'lodash';
import { assertUnreachable } from '../../../../../common/utility_types';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';

export const getStatusText = (value: RuleExecutionStatus | null | undefined): string | null => {
  if (value == null) {
    return null;
  }
  if (value === RuleExecutionStatus['partial failure']) {
    return 'warning';
  }
  return value;
};

export const getCapitalizedStatusText = (
  value: RuleExecutionStatus | null | undefined
): string | null => {
  const status = getStatusText(value);
  return status != null ? capitalize(status) : null;
};

export const getStatusColor = (status: RuleExecutionStatus | null | undefined): IconColor => {
  if (status == null) {
    return 'subdued';
  }
  if (status === RuleExecutionStatus.succeeded) {
    return 'success';
  }
  if (status === RuleExecutionStatus.failed) {
    return 'danger';
  }
  if (
    status === RuleExecutionStatus.running ||
    status === RuleExecutionStatus['partial failure'] ||
    status === RuleExecutionStatus['going to run']
  ) {
    return 'warning';
  }
  return assertUnreachable(status, 'Unknown rule execution status');
};
