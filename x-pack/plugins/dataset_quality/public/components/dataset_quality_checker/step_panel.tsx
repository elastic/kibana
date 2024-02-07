/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanelProps,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';

export const Steps = React.memo(({ children }) => (
  <EuiFlexGroup direction="column">{children}</EuiFlexGroup>
));

export const StepPanel = React.memo(
  ({
    children,
    color = 'plain',
    onGotoPrevious,
    title,
  }: React.PropsWithChildren<{
    color?: EuiPanelProps['color'];
    onGotoPrevious?: () => void;
    title?: React.ReactNode;
  }>) => {
    return (
      <EuiFlexItem grow={false}>
        <EuiSplitPanel.Outer hasShadow={false}>
          {title != null ? (
            <EuiSplitPanel.Inner color={color} paddingSize="m">
              <EuiTitle size="s">
                <div>
                  {onGotoPrevious != null ? (
                    <EuiButtonIcon
                      iconType="arrowLeft"
                      display="empty"
                      onClick={onGotoPrevious}
                      aria-label="return to previous step"
                    />
                  ) : null}
                  {title}
                </div>
              </EuiTitle>
            </EuiSplitPanel.Inner>
          ) : null}
          <EuiSplitPanel.Inner paddingSize="m">{children}</EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
    );
  }
);
