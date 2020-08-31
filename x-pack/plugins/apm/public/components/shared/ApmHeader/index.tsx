/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { KueryBar } from '../KueryBar';
import { DatePicker } from '../DatePicker';
import { EnvironmentFilter } from '../EnvironmentFilter';

export function ApmHeader({ children }: { children: ReactNode }) {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
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
