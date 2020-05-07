/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

interface RowProps {
  rowHeight?: string;
  rowPadding?: string;
}

const RowComponent = styled.div.attrs<RowProps>(({ rowHeight, rowPadding, theme }) => ({
  className: 'siemSkeletonRow',
  rowHeight: rowHeight || theme.eui.euiSizeXL,
  rowPadding: rowPadding || `${theme.eui.paddingSizes.s} ${theme.eui.paddingSizes.xs}`,
}))<RowProps>`
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
  display: flex;
  height: ${({ rowHeight }) => rowHeight};
  padding: ${({ rowPadding }) => rowPadding};
`;
RowComponent.displayName = 'RowComponent';

const Row = React.memo(RowComponent);

Row.displayName = 'Row';

interface CellProps {
  cellColor?: string;
  cellMargin?: string;
}

const CellComponent = styled.div.attrs<CellProps>(({ cellColor, cellMargin, theme }) => ({
  className: 'siemSkeletonRow__cell',
  cellColor: cellColor || theme.eui.euiColorLightestShade,
  cellMargin: cellMargin || theme.eui.gutterTypes.gutterSmall,
}))<CellProps>`
  background-color: ${({ cellColor }) => cellColor};
  border-radius: 2px;
  flex: 1;

  & + & {
    margin-left: ${({ cellMargin }) => cellMargin};
  }
`;
CellComponent.displayName = 'CellComponent';

const Cell = React.memo(CellComponent);

Cell.displayName = 'Cell';

export interface SkeletonRowProps extends CellProps, RowProps {
  cellCount?: number;
}

export const SkeletonRow = React.memo<SkeletonRowProps>(
  ({ cellColor, cellCount = 4, cellMargin, rowHeight, rowPadding }) => {
    const cells = useMemo(
      () =>
        [...Array(cellCount)].map(
          (_, i) => <Cell cellColor={cellColor} cellMargin={cellMargin} key={i} />,
          [cellCount]
        ),
      [cellCount, cellColor, cellMargin]
    );

    return (
      <Row rowHeight={rowHeight} rowPadding={rowPadding}>
        {cells}
      </Row>
    );
  }
);
SkeletonRow.displayName = 'SkeletonRow';
