/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';

import * as i18n from './translations';

interface RuleStatusFailedCallOutProps {
  date: string;
  message: string;
  status?: RuleExecutionStatus | null;
}

const RuleStatusFailedCallOutComponent: React.FC<RuleStatusFailedCallOutProps> = ({
  date,
  message,
  status,
}) => {
  const { shouldBeDisplayed, color, title } = getPropsByStatus(status);
  if (!shouldBeDisplayed) {
    return null;
  }

  return (
    <EuiCallOut
      title={
        <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false}>{title}</EuiFlexItem>
          <EuiFlexItem grow={true}>
            <FormattedDate value={date} fieldName="execution_summary.last_execution.date" />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      color={color}
      iconType="alert"
      data-test-subj="ruleStatusFailedCallOut"
    >
      <p>{message}</p>
    </EuiCallOut>
  );
};

export const RuleStatusFailedCallOut = React.memo(RuleStatusFailedCallOutComponent);
RuleStatusFailedCallOut.displayName = 'RuleStatusFailedCallOut';

interface HelperProps {
  shouldBeDisplayed: boolean;
  color: 'danger' | 'warning';
  title: string;
}

const getPropsByStatus = (status: RuleExecutionStatus | null | undefined): HelperProps => {
  switch (status) {
    case RuleExecutionStatus.failed:
      return {
        shouldBeDisplayed: true,
        color: 'danger',
        title: i18n.ERROR_CALLOUT_TITLE,
      };
    case RuleExecutionStatus['partial failure']:
      return {
        shouldBeDisplayed: true,
        color: 'warning',
        title: i18n.PARTIAL_FAILURE_CALLOUT_TITLE,
      };
    default:
      return {
        shouldBeDisplayed: false,
        color: 'warning',
        title: '',
      };
  }
};
