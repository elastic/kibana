/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import { getHealthColor, rulesStatusesTranslationsMapping } from '../config';
import { RULE_STATUS_LICENSE_ERROR } from '../translations';
import { ExecutionStatusProps } from '../types';

export function ExecutionStatus({ executionStatus }: ExecutionStatusProps) {
  const healthColor = getHealthColor(executionStatus.status);
  const tooltipMessage =
    executionStatus.status === 'error' ? `Error: ${executionStatus?.error?.message}` : null;
  const isLicenseError = executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License;
  const statusMessage = isLicenseError
    ? RULE_STATUS_LICENSE_ERROR
    : rulesStatusesTranslationsMapping[executionStatus.status];

  const health = (
    <EuiHealth data-test-subj={`ruleStatus-${executionStatus.status}`} color={healthColor}>
      {statusMessage}
    </EuiHealth>
  );

  const healthWithTooltip = tooltipMessage ? (
    <EuiToolTip data-test-subj="ruleStatus-error-tooltip" position="top" content={tooltipMessage}>
      {health}
    </EuiToolTip>
  ) : (
    health
  );

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem>{healthWithTooltip}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
