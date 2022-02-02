/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiPanel,
  EuiLoadingContent,
  EuiHealth,
  EuiBasicTableColumn,
} from '@elastic/eui';

import { RuleExecutionEvent } from '../../../../../../common/detection_engine/schemas/common';
import { useRuleExecutionEvents } from '../../../../containers/detection_engine/rules';
import { HeaderSection } from '../../../../../common/components/header_section';
import * as i18n from './translations';
import { FormattedDate } from '../../../../../common/components/formatted_date';

const columns: Array<EuiBasicTableColumn<RuleExecutionEvent>> = [
  {
    name: i18n.COLUMN_STATUS_TYPE,
    render: () => <EuiHealth color="danger">{i18n.TYPE_FAILED}</EuiHealth>,
    truncateText: false,
    width: '16%',
  },
  {
    field: 'date',
    name: i18n.COLUMN_FAILED_AT,
    render: (value: string) => <FormattedDate value={value} fieldName="date" />,
    sortable: false,
    truncateText: false,
    width: '24%',
  },
  {
    field: 'message',
    name: i18n.COLUMN_FAILED_MSG,
    render: (value: string) => <>{value}</>,
    sortable: false,
    truncateText: false,
    width: '60%',
  },
];

interface FailureHistoryProps {
  ruleId: string;
}

const FailureHistoryComponent: React.FC<FailureHistoryProps> = ({ ruleId }) => {
  const events = useRuleExecutionEvents(ruleId);
  const loading = events.isLoading;
  const items = events.data ?? [];

  if (loading) {
    return (
      <EuiPanel hasBorder>
        <HeaderSection title={i18n.LAST_FIVE_ERRORS} />
        <EuiLoadingContent />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder>
      <HeaderSection title={i18n.LAST_FIVE_ERRORS} />
      <EuiBasicTable
        columns={columns}
        items={items}
        loading={loading}
        sorting={{ sort: { field: 'date', direction: 'desc' } }}
      />
    </EuiPanel>
  );
};

export const FailureHistory = React.memo(FailureHistoryComponent);
FailureHistory.displayName = 'FailureHistory';
