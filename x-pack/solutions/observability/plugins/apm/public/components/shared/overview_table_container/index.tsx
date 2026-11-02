/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { useBreakpoints } from '../../../hooks/use_breakpoints';

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
 * Hide the empty message when we don't yet have any items and are still not initiated.
 */
export function OverviewTableContainer({
  children,
  fixedHeight,
  isEmptyAndNotInitiated,
}: {
  children?: ReactNode;
  fixedHeight?: boolean;
  isEmptyAndNotInitiated: boolean;
}) {
  const { isMedium } = useBreakpoints();

  const containerCss = useMemo(() => {
    const useFixedLayout = Boolean(fixedHeight && !isMedium);

    return css`
      min-inline-size: 0;

      ${useFixedLayout
        ? css`
            min-height: ${tableHeight}px;
            display: flex;
            flex-direction: column;
          `
        : undefined}

      .euiBasicTable {
        min-inline-size: 0;

        ${useFixedLayout
          ? css`
              display: flex;
              flex-direction: column;
              flex-grow: 1;

              /* Align the pagination to the bottom of the card */
              > :last-child {
                margin-top: auto;
              }
            `
          : undefined}
      }

      /*
       * Flex items default to min-width: auto, so wide tables clip instead of scrolling.
       * Match EuiTable scrollableInline behavior with a classic overflow-x fallback and
       * stable scrollbar gutter so horizontal scroll is discoverable.
       */
      .euiBasicTable div:has(> table.euiTable) {
        min-inline-size: 0;
        overflow-x: auto;
        scrollbar-gutter: stable;
      }

      .euiTableRowCell {
        visibility: ${isEmptyAndNotInitiated ? 'hidden' : 'visible'};
      }
    `;
  }, [fixedHeight, isEmptyAndNotInitiated, isMedium]);

  return <div css={containerCss}>{children}</div>;
}
