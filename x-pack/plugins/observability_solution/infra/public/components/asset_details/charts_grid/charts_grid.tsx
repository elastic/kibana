/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import React from 'react';

export const ChartsGrid = ({
  children,
  columns,
}: {
  children: React.ReactNode;
  columns: 1 | 2 | 3 | 4;
}) => {
  const childrenArray = React.Children.toArray(children);
  const childrenCount = childrenArray.length;

  const { grid, lastRow } = React.useMemo(() => {
    const isOddLength = childrenCount % columns !== 0;
    const gridItems = isOddLength ? childrenArray.slice(0, -1) : childrenArray;
    const lastRowItem = isOddLength ? childrenArray[childrenCount - 1] : undefined;

    return { grid: gridItems, lastRow: lastRowItem };
  }, [childrenArray, childrenCount, columns]);

  if (childrenArray.length === 1) {
    return <>{children}</>;
  }

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexGrid columns={columns} gutterSize="s">
        {grid.map((item, index) => (
          <EuiFlexItem key={index}>{item}</EuiFlexItem>
        ))}
      </EuiFlexGrid>
      {lastRow && <EuiFlexItem>{lastRow}</EuiFlexItem>}
    </EuiFlexGroup>
  );
};
