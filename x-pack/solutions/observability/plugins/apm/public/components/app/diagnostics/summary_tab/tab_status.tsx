/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export function TabStatus({
  isLoading,
  isOk,
  children,
  ...props
}: {
  isLoading: boolean;
  isOk?: boolean;
  children: React.ReactNode;
} & React.ComponentProps<typeof EuiFlexItem>) {
  return (
    <EuiFlexItem {...props}>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false} data-test-subj={`${props['data-test-subj']}_Badge`}>
              {isLoading ? (
                <EuiBadge color="default">-</EuiBadge>
              ) : isOk ? (
                <EuiBadge color="green">
                  {i18n.translate('xpack.apm.tabStatus.okBadgeLabel', { defaultMessage: 'OK' })}
                </EuiBadge>
              ) : (
                <EuiBadge color="warning">
                  {i18n.translate('xpack.apm.tabStatus.warningBadgeLabel', {
                    defaultMessage: 'Warning',
                  })}
                </EuiBadge>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={10} data-test-subj={`${props['data-test-subj']}_Content`}>
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
