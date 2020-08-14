/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { FunctionComponent, ReactNode } from 'react';

interface ColumnProps {
  children?: ReactNode;
  className?: string;
}

export const LeftColumn: FunctionComponent<ColumnProps> = ({ children, ...rest }) => {
  return (
    <EuiFlexItem grow={2} {...rest}>
      {children}
    </EuiFlexItem>
  );
};

export const CenterColumn: FunctionComponent<ColumnProps> = ({ children, ...rest }) => {
  return (
    <EuiFlexItem grow={9} {...rest}>
      {children}
    </EuiFlexItem>
  );
};

export const RightColumn: FunctionComponent<ColumnProps> = ({ children, ...rest }) => {
  return (
    <EuiFlexItem grow={3} {...rest}>
      {children}
    </EuiFlexItem>
  );
};
