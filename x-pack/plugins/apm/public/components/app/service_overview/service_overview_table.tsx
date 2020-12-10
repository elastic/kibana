/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiBasicTableProps } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

/**
 * The height for a table on the overview page. Is the height of a 5-row basic
 * table.
 */
const tableHeight = 298;

/**
 * A container for the table. Sets height and flex properties on the EUI Basic
 * Table contained within and the first child div of that. This makes it so the
 * pagination controls always stay fixed at the bottom in the same position.
 *
 * Hide the empty message when we don't yet have any items and are still loading.
 */
export const ServiceOverviewTableContainer = styled.div<{
  isEmptyAndLoading: boolean;
}>`
  height: ${tableHeight}px;
  display: flex;
  flex-direction: column;

  .euiBasicTable {
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    > :first-child {
      flex-grow: 1;
    }
  }

  .euiTableRowCell {
    visibility: ${({ isEmptyAndLoading }) =>
      isEmptyAndLoading ? 'hidden' : 'visible'};
  }
`;

export function ServiceOverviewTable<T>(props: EuiBasicTableProps<T>) {
  const { items, loading } = props;
  const isEmptyAndLoading = !!(items.length === 0 && loading);

  return (
    <ServiceOverviewTableContainer isEmptyAndLoading={isEmptyAndLoading}>
      <EuiBasicTable {...props} />
    </ServiceOverviewTableContainer>
  );
}
