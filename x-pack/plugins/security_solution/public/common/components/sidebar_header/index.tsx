/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import React from 'react';

export const SidebarHeader = React.memo<{ children?: React.ReactNode; title: string }>(
  ({ children, title }) => (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
    </>
  )
);

SidebarHeader.displayName = 'SidebarHeader';
