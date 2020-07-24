/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiIconTip,
  EuiButtonEmpty,
} from '@elastic/eui';

const StyledPanel = styled(EuiPanel).attrs((props) => ({
  paddingSize: 'm',
}))`
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${(props) => props.theme.eui.euiColorLightShade};
    margin: -${(props) => props.theme.eui.paddingSizes.m} -${(props) =>
        props.theme.eui.paddingSizes.m}
      ${(props) => props.theme.eui.paddingSizes.m};
    padding: ${(props) => props.theme.eui.paddingSizes.s}
      ${(props) => props.theme.eui.paddingSizes.m};
  }

  h2 {
    padding: ${(props) => props.theme.eui.paddingSizes.xs} 0;
  }
`;

interface OverviewPanelProps {
  title: string;
  tooltip: string;
  linkToText: string;
  linkTo: string;
  children: React.ReactNode;
}

export const OverviewPanel = ({
  title,
  tooltip,
  linkToText,
  linkTo,
  children,
}: OverviewPanelProps) => {
  return (
    <StyledPanel>
      <header>
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip content={tooltip} position="top" type="iInCircle" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiButtonEmpty size="xs" flush="right" href={linkTo}>
          {linkToText}
        </EuiButtonEmpty>
      </header>
      {children}
    </StyledPanel>
  );
};
