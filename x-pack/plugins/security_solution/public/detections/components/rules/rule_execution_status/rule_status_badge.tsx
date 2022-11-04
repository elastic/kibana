/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { HealthTruncateText } from '../../../../common/components/health_truncate_text';
import { getCapitalizedStatusText, getStatusColor } from './utils';

import type { RuleExecutionStatus } from '../../../../../common/detection_engine/rule_monitoring';

interface RuleStatusBadgeProps {
  status: RuleExecutionStatus | null | undefined;
  message?: string;
}

/**
 * Shows rule execution status
 * @param status - rule execution status
 */
const RuleStatusBadgeComponent = ({ status, message }: RuleStatusBadgeProps) => {
  const statusText = getCapitalizedStatusText(status);
  const statusColor = getStatusColor(status);
  return (
    <HealthTruncateText
      tooltipContent={message ?? statusText}
      healthColor={statusColor}
      dataTestSubj="ruleExecutionStatus"
    >
      {statusText ?? getEmptyTagValue()}
    </HealthTruncateText>
  );
};

export const RuleStatusBadge = React.memo(RuleStatusBadgeComponent);
RuleStatusBadge.displayName = 'RuleStatusBadge';
