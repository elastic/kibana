/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';

import type { RuleExecutionStatus } from '../../../../../../../common/detection_engine/rule_monitoring';
import { getEmptyTagValue } from '../../../../../../common/components/empty_value';
import { RuleStatusBadge } from '../../../../../../detections/components/rules/rule_execution_status';
import {
  getCapitalizedStatusText,
  getStatusColor,
} from '../../../../../../detections/components/rules/rule_execution_status/utils';

const EMPTY_STATUS_TEXT = getEmptyTagValue();

interface ExecutionStatusIndicatorProps {
  status?: RuleExecutionStatus | null | undefined;
  showTooltip?: boolean;
}

const ExecutionStatusIndicatorComponent: React.FC<ExecutionStatusIndicatorProps> = ({
  status,
  showTooltip = false,
}) => {
  const statusText = getCapitalizedStatusText(status) ?? EMPTY_STATUS_TEXT;
  const statusColor = getStatusColor(status);

  return showTooltip ? (
    <RuleStatusBadge status={status} />
  ) : (
    <EuiHealth color={statusColor}>{statusText}</EuiHealth>
  );
};

export const ExecutionStatusIndicator = React.memo(ExecutionStatusIndicatorComponent);
ExecutionStatusIndicator.displayName = 'ExecutionStatusIndicator';
