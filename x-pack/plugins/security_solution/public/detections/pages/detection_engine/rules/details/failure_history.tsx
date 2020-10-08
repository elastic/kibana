/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiBasicTable,
  EuiPanel,
  EuiLoadingContent,
  EuiHealth,
  EuiBasicTableColumn,
} from '@elastic/eui';
import React, { memo } from 'react';

import { useRuleStatus, RuleInfoStatus } from '../../../../containers/detection_engine/rules';
import { HeaderSection } from '../../../../../common/components/header_section';
import * as i18n from './translations';
import { FormattedDate } from '../../../../../common/components/formatted_date';

interface FailureHistoryProps {
  id?: string | null;
}

const FailureHistoryComponent: React.FC<FailureHistoryProps> = ({ id }) => {
  const [loading, ruleStatus] = useRuleStatus(id);
  if (loading) {
    return (
      <EuiPanel>
        <HeaderSection title={i18n.LAST_FIVE_ERRORS} />
        <EuiLoadingContent />
      </EuiPanel>
    );
  }
  const columns: Array<EuiBasicTableColumn<RuleInfoStatus>> = [
    {
      name: i18n.COLUMN_STATUS_TYPE,
      render: () => <EuiHealth color="danger">{i18n.TYPE_FAILED}</EuiHealth>,
      truncateText: false,
      width: '16%',
    },
    {
      field: 'last_failure_at',
      name: i18n.COLUMN_FAILED_AT,
      render: (value: string) => <FormattedDate value={value} fieldName="last_failure_at" />,
      sortable: false,
      truncateText: false,
      width: '24%',
    },
    {
      field: 'last_failure_message',
      name: i18n.COLUMN_FAILED_MSG,
      render: (value: string) => <>{value}</>,
      sortable: false,
      truncateText: false,
      width: '60%',
    },
  ];
  return (
    <EuiPanel>
      <HeaderSection title={i18n.LAST_FIVE_ERRORS} />
      <EuiBasicTable
        columns={columns}
        loading={loading}
        items={
          ruleStatus != null ? ruleStatus?.failures.filter((rs) => rs.last_failure_at != null) : []
        }
        sorting={{ sort: { field: 'status_date', direction: 'desc' } }}
      />
    </EuiPanel>
  );
};

export const FailureHistory = memo(FailureHistoryComponent);
