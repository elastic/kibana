/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import React, { memo } from 'react';

import { RuleStatusType } from '../../../containers/detection_engine/rules';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { getStatusColor } from './helpers';
import * as i18n from './translations';

interface RuleStatusProps {
  children: React.ReactNode | null | undefined;
  statusDate: string | null | undefined;
  status: RuleStatusType | null | undefined;
}

const RuleStatusComponent: React.FC<RuleStatusProps> = ({ children, statusDate, status }) => {
  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiHealth color={getStatusColor(status ?? null)}>
          <EuiText data-test-subj="ruleStatus" size="xs">
            {status ?? getEmptyTagValue()}
          </EuiText>
        </EuiHealth>
      </EuiFlexItem>
      {statusDate != null && status != null && (
        <>
          <EuiFlexItem grow={false}>
            <>{i18n.STATUS_AT}</>
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <FormattedDate value={statusDate} fieldName={i18n.STATUS_DATE} />
          </EuiFlexItem>
        </>
      )}
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </>
  );
};

export const RuleStatus = memo(RuleStatusComponent);
