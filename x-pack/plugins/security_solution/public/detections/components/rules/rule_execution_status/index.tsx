/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiHealth, EuiToolTip } from '@elastic/eui';

import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { HealthTruncateText } from '../../../../common/components/health_truncate_text';
import { getStatusColor } from '../rule_status/helpers';

import { getCapitalizedRuleStatusText } from '../../../../../common/detection_engine/utils';
import type { RuleExecutionStatus as RuleExecutionStatusType } from '../../../../../common/detection_engine/schemas/common/schemas';

interface RuleExecutionStatusProps {
  status: RuleExecutionStatusType | null | undefined;
}

/**
 * Shows rule execution status
 * @param status - rule execution status
 */
const RuleExecutionStatusComponent = ({ status }: RuleExecutionStatusProps) => {
  const displayStatus = getCapitalizedRuleStatusText(status);
  return (
    <EuiToolTip content={displayStatus}>
      <EuiHealth color={getStatusColor(status ?? null)}>
        <HealthTruncateText>{displayStatus ?? getEmptyTagValue()}</HealthTruncateText>
      </EuiHealth>
    </EuiToolTip>
  );
};

export const RuleExecutionStatus = React.memo(RuleExecutionStatusComponent);

RuleExecutionStatus.displayName = 'RuleExecutionStatus';
