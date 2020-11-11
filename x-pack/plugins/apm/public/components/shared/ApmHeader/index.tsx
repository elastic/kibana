/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { HeaderMenuPortal } from '../../../../../observability/public';
import { ActionMenu } from '../../../application/action_menu';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { DatePicker } from '../DatePicker';
import { EnvironmentFilter } from '../EnvironmentFilter';
import { KueryBar } from '../KueryBar';

export function ApmHeader({ children }: { children: ReactNode }) {
  const { setHeaderActionMenu } = useApmPluginContext().appMountParameters;

  return (
    <>
      <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu}>
        <ActionMenu />
      </HeaderMenuPortal>
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap={true}>
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup alignItems="flexStart" gutterSize="s">
        <EuiFlexItem grow={3}>
          <KueryBar />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EnvironmentFilter />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
