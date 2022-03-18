/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled, { AnyStyledComponent } from 'styled-components';
import { EuiInMemoryTable } from '@elastic/eui';

export const ThreatSummaryTable = styled(EuiInMemoryTable as unknown as AnyStyledComponent)`
  .euiTableHeaderCell,
  .euiTableRowCell {
    border: none;
  }
  .euiTableHeaderCell .euiTableCellContent {
    padding: 0;
  }
`;
