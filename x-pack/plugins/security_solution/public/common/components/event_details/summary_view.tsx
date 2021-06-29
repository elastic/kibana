/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable, EuiBasicTableColumn, EuiTitle, EuiHorizontalRule } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { SummaryRow } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledEuiInMemoryTable = styled(EuiInMemoryTable as any)`
  .euiTableHeaderCell {
    border: none;
  }
  .euiTableRowCell {
    border: none;
  }

  .euiTableCellContent {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
`;

const StyledEuiTitle = styled(EuiTitle)`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
  text-transform: lowercase;
  padding-top: ${({ theme }) => theme.eui.paddingSizes.s};
  h2 {
    min-width: 120px;
  }
  hr {
    max-width: 75%;
  }
`;

const FlexDiv = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
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
        <StyledEuiTitle size="xxs">
          <FlexDiv>
            <h2>{title}</h2>
            <EuiHorizontalRule margin="none" />
          </FlexDiv>
        </StyledEuiTitle>
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
