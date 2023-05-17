/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export interface PolicyFormRowLayoutProps {
  label: ReactNode;
  windows?: ReactNode;
  linux?: ReactNode;
  macos?: ReactNode;
  all?: ReactNode;
}

export const PolicyFormRowLayout = memo<PolicyFormRowLayoutProps>(
  ({ label, windows, linux, macos, all }) => {
    if (all && (windows || linux || macos)) {
      throw new Error(
        `[windows], [linux] and/or [macos] props can not be used when [all] prop defined`
      );
    }

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>{label}</EuiFlexItem>
        {all ? (
          <EuiFlexItem>{all}</EuiFlexItem>
        ) : (
          <>
            <EuiFlexItem>{windows}</EuiFlexItem>
            <EuiFlexItem>{macos}</EuiFlexItem>
            <EuiFlexItem>{linux}</EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    );
  }
);
PolicyFormRowLayout.displayName = 'PolicyFormRowLayout';
