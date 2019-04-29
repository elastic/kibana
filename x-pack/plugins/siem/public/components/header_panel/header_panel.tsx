/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

export interface HeaderPanelProps {
  children?: React.ReactNode;
  subtitle?: string | React.ReactNode;
  title: string | React.ReactNode;
  tooltip?: string;
}

export const HeaderPanel = pure<HeaderPanelProps>(({ children, subtitle, title, tooltip }) => (
  <FlexGroup alignItems="center">
    <EuiFlexItem>
      <EuiTitle>
        <h2 data-test-subj="page_headline_title">
          {title}{' '}
          {tooltip && <EuiIconTip color="subdued" content={tooltip} position="top" size="l" />}
        </h2>
      </EuiTitle>

      <EuiText color="subdued" size="s">
        {subtitle}
      </EuiText>
    </EuiFlexItem>

    {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
  </FlexGroup>
));

const FlexGroup = styled(EuiFlexGroup)`
  margin-bottom: 12px;
`;
