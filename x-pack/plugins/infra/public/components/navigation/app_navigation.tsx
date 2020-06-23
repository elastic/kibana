/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '../../../../observability/public';

interface AppNavigationProps {
  'aria-label': string;
  children: React.ReactNode;
}

export const AppNavigation = ({ 'aria-label': label, children }: AppNavigationProps) => (
  <Nav aria-label={label}>
    <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  </Nav>
);

const Nav = euiStyled.nav`
  background: ${(props) => props.theme.eui.euiColorEmptyShade};
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  padding: ${(props) =>
    `${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL} ${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL}`};
  .euiTabs {
    padding-left: 3px;
    margin-left: -3px;
  };
`;
