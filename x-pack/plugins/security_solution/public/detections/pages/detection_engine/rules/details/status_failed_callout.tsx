/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';

import { FormattedDate } from '../../../../../common/components/formatted_date';
import * as i18n from './translations';

interface RuleStatusFailedCallOutComponentProps {
  date: string;
  message: string;
  color?: 'danger' | 'primary' | 'success' | 'warning';
}

const RuleStatusFailedCallOutComponent: React.FC<RuleStatusFailedCallOutComponentProps> = ({
  date,
  message,
  color,
}) => (
  <EuiCallOut
    title={
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          {color === 'warning' ? i18n.PARTIAL_FAILURE_CALLOUT_TITLE : i18n.ERROR_CALLOUT_TITLE}
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <FormattedDate value={date} fieldName="last_failure_at" />
        </EuiFlexItem>
      </EuiFlexGroup>
    }
    color={color ? color : 'danger'}
    iconType="alert"
  >
    <p>{message}</p>
  </EuiCallOut>
);

export const RuleStatusFailedCallOut = memo(RuleStatusFailedCallOutComponent);
