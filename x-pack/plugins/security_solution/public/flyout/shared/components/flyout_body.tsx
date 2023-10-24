/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutBody, EuiPanel } from '@elastic/eui';

interface FlyoutBodyProps extends React.ComponentProps<typeof EuiFlyoutBody> {
  children: React.ReactNode;
}

/**
 * Flyout body wrapper component with proper padding
 */
export const FlyoutBody: FC<FlyoutBodyProps> = memo(({ children, ...flyoutBodyProps }) => {
  return (
    <EuiFlyoutBody {...flyoutBodyProps}>
      <EuiPanel hasShadow={false} color="transparent">
        {children}
      </EuiPanel>
    </EuiFlyoutBody>
  );
});

FlyoutBody.displayName = 'FlyoutBody';
