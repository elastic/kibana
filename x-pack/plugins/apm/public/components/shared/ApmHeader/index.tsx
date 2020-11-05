/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { useActionMenu } from '../../../hooks/use_action_menu';
import { DatePicker } from '../DatePicker';
import { EnvironmentFilter } from '../EnvironmentFilter';
import { KueryBar } from '../KueryBar';

export function ApmHeader({ children }: { children: ReactNode }) {
  useActionMenu();

  return (
    <>
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
