/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

const Header = styled.header`
  ${({ theme }) => `
    border-bottom: ${theme.eui.euiBorderThin};
    padding-bottom: ${theme.eui.euiSizeL};
    margin: ${theme.eui.euiSizeL} 0;
  `}
`;

export interface HeaderPageProps {
  children?: React.ReactNode;
  subtitle?: string | React.ReactNode;
  title: string | React.ReactNode;
}

export const HeaderPage = pure<HeaderPageProps>(({ children, subtitle, title }) => (
  <Header>
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiTitle size="l">
          <h1 data-test-subj="page_headline_title">{title}</h1>
        </EuiTitle>

        <EuiText color="subdued" size="s">
          {subtitle}
        </EuiText>
      </EuiFlexItem>

      {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
    </EuiFlexGroup>
  </Header>
));
