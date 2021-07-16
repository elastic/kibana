/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexItem } from '@elastic/eui';

import { Column } from './types';

export interface CellProps<Item> {
  alignItems?: Column<Item>['alignItems'];
  flexBasis?: Column<Item>['flexBasis'];
  flexGrow?: Column<Item>['flexGrow'];
}

export const Cell = <Item extends object>({
  children,
  alignItems,
  flexBasis,
  flexGrow,
}: CellProps<Item> & { children?: React.ReactNode }) => {
  return (
    <EuiFlexItem
      style={{
        flexBasis,
        flexGrow,
        alignItems,
      }}
    >
      {children}
    </EuiFlexItem>
  );
};
