/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

export interface SidePanelContentLayoutProps {
  children: ReactNode;
  headerContent?: ReactNode;
}

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
        <EuiFlexItem grow className="eui-scrollBar eui-yScroll layout-container">
          <div>{children}</div>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
SidePanelContentLayout.displayName = 'SidePanelContentLayout';
