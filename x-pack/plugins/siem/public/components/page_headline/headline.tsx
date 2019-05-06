/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

export const FlexGroup = styled(EuiFlexGroup)`
  margin-top: 120px;
`;

export interface PageHeadlineProps {
  children?: React.ReactNode;
  statType?: string;
  subtitle?: string | React.ReactNode;
  title: string | React.ReactNode;
}

export const PageHeadlineComponent = pure<PageHeadlineProps>(({ children, subtitle, title }) => (
  <FlexGroup alignItems="center">
    <EuiFlexItem>
      <EuiTitle size="l">
        <h1 data-test-subj="page_headline_title">{title}</h1>
      </EuiTitle>

      <EuiText color="subdued" size="s">
        {subtitle}
      </EuiText>
    </EuiFlexItem>

    {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
  </FlexGroup>
));
