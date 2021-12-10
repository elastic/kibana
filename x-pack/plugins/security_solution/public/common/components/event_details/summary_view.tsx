/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiLink,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { SummaryRow } from './helpers';
import { VIEW_ALL_DOCUMENT_FIELDS } from './translations';

export const Indent = styled.div`
  padding: 0 12px;
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StyledEuiInMemoryTable = styled(EuiInMemoryTable as any)`
  .euiTableHeaderCell,
  .euiTableRowCell {
    border: none;
  }
  .euiTableHeaderCell .euiTableCellContent {
    padding: 0;
  }

  .flyoutOverviewDescription {
    .hoverActions-active {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }

    &:hover {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }
  }
`;

export const SummaryViewComponent: React.FC<{
  goToTable: () => void;
  title: string;
  summaryColumns: Array<EuiBasicTableColumn<SummaryRow>>;
  summaryRows: SummaryRow[];
  dataTestSubj?: string;
}> = ({ goToTable, summaryColumns, summaryRows, dataTestSubj = 'summary-view', title }) => {
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
            <EuiText size="xs">{VIEW_ALL_DOCUMENT_FIELDS}</EuiText>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <Indent>
        <StyledEuiInMemoryTable
          data-test-subj={dataTestSubj}
          items={summaryRows}
          columns={summaryColumns}
          compressed
        />
      </Indent>
    </div>
  );
};

export const SummaryView = React.memo(SummaryViewComponent);
