/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import React, { memo } from 'react';
import styled from 'styled-components';
import { useTopGlobalHeaderPosition } from '../hooks/use_top_global_header_position';
import { PlatformIcon } from '../../../../../components/endpoint_responder/components/platforms';
import { PolicyFormRowLayout } from './policy_form_row_layout';

const HeaderContainer = styled.div<{ $top: string }>`
  position: sticky;
  top: ${(props) => props.$top ?? '94px'};
  z-index: ${({ theme: { eui } }) => eui.euiZFlyout};
  padding-top: 5px;
  background-color: ${({ theme: { eui } }) => eui.euiHeaderBackgroundColor};
`;

export const PolicyFormHeader = memo(() => {
  const { bottom } = useTopGlobalHeaderPosition();

  return (
    <HeaderContainer $top={`${bottom}px`}>
      <PolicyFormRowLayout
        label={''}
        windows={<PlatformIdentifier type="windows" />}
        linux={<PlatformIdentifier type="linux" />}
        macos={<PlatformIdentifier type="macos" />}
      />
    </HeaderContainer>
  );
});
PolicyFormHeader.displayName = 'PolicyFormHeader';

export interface PlatformIdentifierProps {
  type: 'windows' | 'linux' | 'macos';
}

const PlatformIdentifier = memo<PlatformIdentifierProps>(({ type }) => {
  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="l">
      <EuiFlexGroup responsive={false} gutterSize="s" justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <PlatformIcon platform={type} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{type}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
PlatformIdentifier.displayName = 'PlatformIdentifier';
