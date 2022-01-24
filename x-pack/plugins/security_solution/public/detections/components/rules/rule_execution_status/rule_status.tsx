/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';

import { FormattedDate } from '../../../../common/components/formatted_date';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { getStatusColor, normalizeRuleExecutionStatus } from './utils';
import * as i18n from './translations';

interface RuleStatusProps {
  status: RuleExecutionStatus | null | undefined;
  date: string | null | undefined;
  children: React.ReactNode | null | undefined;
}

const RuleStatusComponent: React.FC<RuleStatusProps> = ({ status, date, children }) => {
  const normalizedStatus = normalizeRuleExecutionStatus(status);
  const statusColor = getStatusColor(normalizedStatus);
  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiHealth color={statusColor}>
          <EuiText data-test-subj="ruleStatus" size="xs">
            {normalizedStatus ?? getEmptyTagValue()}
          </EuiText>
        </EuiHealth>
      </EuiFlexItem>
      {date != null && normalizedStatus != null && (
        <>
          <EuiFlexItem grow={false}>
            <>{i18n.STATUS_AT}</>
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <FormattedDate value={date} fieldName={i18n.STATUS_DATE} />
          </EuiFlexItem>
        </>
      )}
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </>
  );
};

export const RuleStatus = React.memo(RuleStatusComponent);
RuleStatus.displayName = 'RuleStatus';
