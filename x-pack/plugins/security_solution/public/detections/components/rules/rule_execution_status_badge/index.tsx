/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { HealthTruncateText } from '../../../../common/components/health_truncate_text';
import { getStatusColor } from '../rule_status/helpers';

import { getCapitalizedRuleStatusText } from '../../../../../common/detection_engine/utils';
import type { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';

interface RuleExecutionStatusBadgeProps {
  status: RuleExecutionStatus | null | undefined;
}

/**
 * Shows rule execution status
 * @param status - rule execution status
 */
const RuleExecutionStatusBadgeComponent = ({ status }: RuleExecutionStatusBadgeProps) => {
  const displayStatus = getCapitalizedRuleStatusText(status);
  return (
    <HealthTruncateText
      tooltipContent={displayStatus}
      healthColor={getStatusColor(status ?? null)}
      dataTestSubj="ruleExecutionStatus"
    >
      {displayStatus ?? getEmptyTagValue()}
    </HealthTruncateText>
  );
};

export const RuleExecutionStatusBadge = React.memo(RuleExecutionStatusBadgeComponent);

RuleExecutionStatusBadge.displayName = 'RuleExecutionStatusBadge';
