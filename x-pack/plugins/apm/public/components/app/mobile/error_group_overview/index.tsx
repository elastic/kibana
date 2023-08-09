/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { Tabs } from './tabs/tabs';
import { MobileErrorTabIds } from './hooks/use_tab_id';
import { useApmParams } from '../../../../hooks/use_apm_params';

export function MobileErrorCrashesOverview() {
  const {
    query: { mobileErrorTabId = MobileErrorTabIds.ERRORS },
  } = useApmParams('/mobile-services/{serviceName}/errors');
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiSpacer size="m" />
      <EuiFlexItem grow={false}>
        <Tabs
          mobileErrorTabId={
            MobileErrorTabIds[
              mobileErrorTabId as keyof typeof MobileErrorTabIds
            ]
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
