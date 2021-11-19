/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiHealth, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';

import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { getStatusColor } from '../rule_status/helpers';

import { getCapitalizedRuleStatusText } from '../../../../../common/detection_engine/utils';
import type { RuleExecutionStatus as RuleExecutionStatusType } from '../../../../../common/detection_engine/schemas/common/schemas';

const StatusTextWrapper = styled.div`
  width: 100%;
  display: inline-grid;
`;

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
    <EuiHealth color={getStatusColor(status ?? null)}>
      <StatusTextWrapper>
        <EuiToolTip content={displayStatus} anchorClassName="eui-textTruncate">
          <span>{displayStatus ?? getEmptyTagValue()}</span>
        </EuiToolTip>
      </StatusTextWrapper>
    </EuiHealth>
  );
};

export const RuleExecutionStatus = React.memo(RuleExecutionStatusComponent);

RuleExecutionStatus.displayName = 'RuleExecutionStatus';
