/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { useBreakPoints } from '../../../hooks/use_break_points';

/**
 * The height for a table on a overview page. Is the height of a 5-row basic
 * table.
 */
const tableHeight = 282;

/**
 * A container for the table. Sets height and flex properties on the EUI Basic
 * Table contained within and the first child div of that. This makes it so the
 * pagination controls always stay fixed at the bottom in the same position.
 *
 * Only do this when we're at a non-mobile breakpoint.
 *
 * Hide the empty message when we don't yet have any items and are still loading.
 */
const OverviewTableContainerDiv = euiStyled.div<{
  fixedHeight?: boolean;
  isEmptyAndLoading: boolean;
  shouldUseMobileLayout: boolean;
}>`
  ${({ fixedHeight, shouldUseMobileLayout }) =>
    shouldUseMobileLayout || !fixedHeight
      ? ''
      : `
  min-height: ${tableHeight}px;
  display: flex;
  flex-direction: column;

  .euiBasicTable {
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    > :first-child {
      flex-grow: 1;
    }
  `}

  .euiTableRowCell {
    visibility: ${({ isEmptyAndLoading }) =>
      isEmptyAndLoading ? 'hidden' : 'visible'};
  }
`;

export function OverviewTableContainer({
  children,
  fixedHeight,
  isEmptyAndLoading,
}: {
  children?: ReactNode;
  fixedHeight?: boolean;
  isEmptyAndLoading: boolean;
}) {
  const { isMedium } = useBreakPoints();

  return (
    <OverviewTableContainerDiv
      fixedHeight={fixedHeight}
      isEmptyAndLoading={isEmptyAndLoading}
      shouldUseMobileLayout={isMedium}
    >
      {children}
    </OverviewTableContainerDiv>
  );
}
