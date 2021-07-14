/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable, EuiBasicTableColumn, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { SummaryRow } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StyledEuiInMemoryTable = styled(EuiInMemoryTable as any)`
  .euiTableHeaderCell,
  .euiTableRowCell {
    border: none;
  }
  .euiTableHeaderCell .euiTableCellContent {
    padding: 0;
  }
`;

export const SummaryViewComponent: React.FC<{
  title?: string;
  summaryColumns: Array<EuiBasicTableColumn<SummaryRow>>;
  summaryRows: SummaryRow[];
  dataTestSubj?: string;
}> = ({ summaryColumns, summaryRows, dataTestSubj = 'summary-view', title }) => {
  return (
    <>
      {title && (
        <EuiTitle size="xxs">
          <h6>{title}</h6>
        </EuiTitle>
      )}
      <StyledEuiInMemoryTable
        data-test-subj={dataTestSubj}
        items={summaryRows}
        columns={summaryColumns}
        compressed
      />
    </>
  );
};

export const SummaryView = React.memo(SummaryViewComponent);
