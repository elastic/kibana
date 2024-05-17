/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutFooter, EuiPanel } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';

interface FlyoutFooterProps extends React.ComponentProps<typeof EuiFlyoutFooter> {
  children: React.ReactNode;
}

/**
 * Wrapper of `EuiFlyoutFooter`, setting the recommended `16px` padding using a EuiPanel.
 */
export const FlyoutFooter: FC<FlyoutFooterProps> = memo(({ children, ...flyoutFooterProps }) => {
  return (
    <EuiFlyoutFooter {...flyoutFooterProps}>
      <EuiPanel hasShadow={false} color="transparent">
        {children}
      </EuiPanel>
    </EuiFlyoutFooter>
  );
});

FlyoutFooter.displayName = 'FlyoutFooter';
