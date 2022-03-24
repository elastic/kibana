/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiLink,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiIconTip,
} from '@elastic/eui';
import React from 'react';

import type { AlertSummaryRow } from './helpers';
import * as i18n from './translations';
import { VIEW_ALL_FIELDS } from './translations';
import { SummaryTable } from './table/summary_table';
import { SummaryValueCell } from './table/summary_value_cell';
import { PrevalenceCellRenderer } from './table/prevalence_cell';

const summaryColumns: Array<EuiBasicTableColumn<AlertSummaryRow>> = [
  {
    field: 'title',
    truncateText: false,
    name: i18n.HIGHLIGHTED_FIELDS_FIELD,
    textOnly: true,
  },
  {
    field: 'description',
    truncateText: false,
    render: SummaryValueCell,
    name: i18n.HIGHLIGHTED_FIELDS_VALUE,
  },
  {
    field: 'description',
    truncateText: true,
    render: PrevalenceCellRenderer,
    name: (
      <>
        {i18n.HIGHLIGHTED_FIELDS_ALERT_PREVALENCE}{' '}
        <EuiIconTip
          type="iInCircle"
          color="subdued"
          title="Alert Prevalence"
          content={<span>{i18n.HIGHLIGHTED_FIELDS_ALERT_PREVALENCE_TOOLTIP}</span>}
        />
      </>
    ),
    align: 'right',
    width: '130px',
  },
];

const rowProps = {
  // Class name for each row. On hover of a row, all actions for that row will be shown.
  className: 'flyoutTableHoverActions',
};

const SummaryViewComponent: React.FC<{
  goToTable: () => void;
  title: string;
  rows: AlertSummaryRow[];
}> = ({ goToTable, rows, title }) => {
  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxxs">
            <h5>{title}</h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink onClick={goToTable}>
            <EuiText size="xs">{VIEW_ALL_FIELDS}</EuiText>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <SummaryTable
        data-test-subj="summary-view"
        items={rows}
        columns={summaryColumns}
        rowProps={rowProps}
        compressed
      />
    </div>
  );
};

export const SummaryView = React.memo(SummaryViewComponent);
