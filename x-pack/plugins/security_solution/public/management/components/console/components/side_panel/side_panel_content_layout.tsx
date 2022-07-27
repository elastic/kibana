/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import styled from 'styled-components';

export interface SidePanelContentLayoutProps {
  children: ReactNode;
  headerContent?: ReactNode;
}

const StyledEuiFlexItemNoPadding = styled(EuiFlexItem)`
  padding: 0 !important;
`;

/**
 * A layout component for displaying content in the right-side panel of the console
 */
export const SidePanelContentLayout = memo<SidePanelContentLayoutProps>(
  ({ headerContent, children }) => {
    return (
      <EuiFlexGroup
        direction="column"
        responsive={false}
        className="eui-fullHeight"
        gutterSize="none"
      >
        {headerContent && (
          <>
            <EuiFlexItem grow={false} className="layout-container">
              {headerContent}
            </EuiFlexItem>
            <EuiHorizontalRule margin="none" />
          </>
        )}
        <StyledEuiFlexItemNoPadding className="eui-scrollBar eui-yScroll layout-container">
          <div>{children}</div>
        </StyledEuiFlexItemNoPadding>
      </EuiFlexGroup>
    );
  }
);
SidePanelContentLayout.displayName = 'SidePanelContentLayout';
