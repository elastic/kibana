/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

interface HeaderPageProps {
  children?: React.ReactNode;
  subtitle: string | React.ReactNode;
  title: string | React.ReactNode;
}

export const FlexGroup = styled(EuiFlexGroup)`
  margin-top: 78px;
`;

export const HeaderPage = pure<HeaderPageProps>(({ children, subtitle, title }) => (
  <>
    <FlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiTitle size="l">
          <h1>{title}</h1>
        </EuiTitle>

        <EuiText color="subdued" size="s">
          <p>{subtitle}</p>
        </EuiText>
      </EuiFlexItem>

      {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
    </FlexGroup>

    <EuiHorizontalRule margin="xxl" />
  </>
));
