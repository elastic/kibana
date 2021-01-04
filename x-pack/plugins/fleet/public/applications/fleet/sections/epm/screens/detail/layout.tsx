/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { FunctionComponent, ReactNode } from 'react';
import { FlexItemGrowSize } from '@elastic/eui/src/components/flex/flex_item';

interface ColumnProps {
  children?: ReactNode;
  className?: string;
  columnGrow?: FlexItemGrowSize;
}

export const LeftColumn: FunctionComponent<ColumnProps> = ({
  columnGrow = 2,
  children,
  ...rest
}) => {
  return (
    <EuiFlexItem grow={columnGrow} {...rest}>
      {children}
    </EuiFlexItem>
  );
};

export const CenterColumn: FunctionComponent<ColumnProps> = ({
  columnGrow = 9,
  children,
  ...rest
}) => {
  return (
    <EuiFlexItem grow={columnGrow} {...rest}>
      {children}
    </EuiFlexItem>
  );
};

export const RightColumn: FunctionComponent<ColumnProps> = ({
  columnGrow = 3,
  children,
  ...rest
}) => {
  return (
    <EuiFlexItem grow={columnGrow} {...rest}>
      {children}
    </EuiFlexItem>
  );
};
