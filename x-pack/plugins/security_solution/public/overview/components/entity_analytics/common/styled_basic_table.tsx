/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import styled from 'styled-components';
import { EuiBasicTable } from '@elastic/eui';

// @ts-expect-error TS2769
export const StyledBasicTable = styled(EuiBasicTable)`
  .euiTableRow {
    .euiTableRowCell {
      border-bottom: none !important;
    }
  }

  .inlineActions {
    opacity: 0;
  }

  .EntityAnalyticsTableHoverActions {
    .inlineActions-popoverOpen {
      opacity: 1;
    }

    &:hover {
      .inlineActions {
        opacity: 1;
      }
    }
  }
`;
