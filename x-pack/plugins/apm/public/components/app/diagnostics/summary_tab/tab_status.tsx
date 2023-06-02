/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
export function TabStatus({
  isLoading,
  isOk,
  children,
}: {
  isLoading: boolean;
  isOk?: boolean;
  children: React.ReactNode;
}) {
  return (
    <EuiFlexItem>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {isLoading ? (
                <EuiBadge color="default">-</EuiBadge>
              ) : isOk ? (
                <EuiBadge color="green">OK</EuiBadge>
              ) : (
                <EuiBadge color="warning">Warning</EuiBadge>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={10}>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
