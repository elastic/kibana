/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';

const operatorStyle = css`
  align-self: center;
`;

export function Operator(): JSX.Element {
  return (
    <EuiFlexItem className={operatorStyle} grow={false}>
      {'>='}
    </EuiFlexItem>
  );
}

interface ResponsiveGroupProps {
  direction: 'row' | 'column';
  children: React.ReactNode;
}

export function ResponsiveGroup({ direction, children }: ResponsiveGroupProps): JSX.Element {
  return (
    <EuiFlexGroup direction={direction} gutterSize={direction === 'row' ? 'l' : 's'}>
      {children}
    </EuiFlexGroup>
  );
}
