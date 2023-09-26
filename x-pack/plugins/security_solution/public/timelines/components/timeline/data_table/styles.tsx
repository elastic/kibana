/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { css } from '@emotion/react';

export const progressStyle = css`
  z-index: 2;
`;

export const StyledTimelineUnifiedDataTable = styled.div.attrs(({ className = '' }) => ({
  className: `unifiedDataTable ${className}`,
  role: 'rowgroup',
}))`
  .udtTimeline [data-gridcell-column-id|='select'] {
    border-right: none;
  }
  .udtTimeline [data-gridcell-column-id|='openDetails'] .euiDataGridRowCell__contentByHeight {
    margin-top: 3px;
  }

  .udtTimeline [data-gridcell-column-id|='select'] .euiDataGridRowCell__contentByHeight {
    margin-top: 5px;
  }

  .udtTimeline .euiDataGridRowCell--lastColumn.euiDataGridRowCell--controlColumn {
    background-color: white;
  }

  .udtTimeline .siemEventsTable__trSupplement--summary {
    border-radius: 8px;
  }

  .udtTimeline .euiDataGridRow:has(.buildingBlockType) {
    background: repeating-linear-gradient(
      127deg,
      rgba(245, 167, 0, 0.2),
      rgba(245, 167, 0, 0.2) 1px,
      rgba(245, 167, 0, 0.05) 2px,
      rgba(245, 167, 0, 0.05) 10px
    );
  }
  .udtTimeline .euiDataGridRow:has(.eqlSequence) {
    .euiDataGridRowCell--firstColumn {
      ${({ theme }) => `border-left: 4px solid ${theme.eui.euiColorPrimary};`}
    }
    background: repeating-linear-gradient(
      127deg,
      rgba(0, 107, 180, 0.2),
      rgba(0, 107, 180, 0.2) 1px,
      rgba(0, 107, 180, 0.05) 2px,
      rgba(0, 107, 180, 0.05) 10px
    );
  }
  .udtTimeline .euiDataGridRow:has(.eqlNonSequence) {
    .euiDataGridRowCell--firstColumn {
      ${({ theme }) => `border-left: 4px solid ${theme.eui.euiColorAccent};`}
    }
    background: repeating-linear-gradient(
      127deg,
      rgba(221, 10, 115, 0.2),
      rgba(221, 10, 115, 0.2) 1px,
      rgba(221, 10, 115, 0.05) 2px,
      rgba(221, 10, 115, 0.05) 10px
    );
  }
  .udtTimeline .euiDataGridRow:has(.nonRawEvent) .euiDataGridRowCell--firstColumn {
    ${({ theme }) => `border-left: 4px solid ${theme.eui.euiColorWarning};`}
  }
  .udtTimeline .euiDataGridRow:has(.rawEvent) .euiDataGridRowCell--firstColumn {
    ${({ theme }) => `border-left: 4px solid ${theme.eui.euiColorLightShade};`}
  }

  .udtTimeline .ccccccc {
    display: flex;
  }

  .udtTimeline .rightPosition {
    position: absolute;
    right: 5px;
    button {
      ${({ theme }) => `color: ${theme.eui.euiColorDarkShade};`}
    }
  }

  .udtTimeline .euiDataGrid__rightControls {
    padding-right: 30px;
  }
`;
