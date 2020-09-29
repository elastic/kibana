/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { DatePicker } from '../DatePicker';
import { EnvironmentFilter } from '../EnvironmentFilter';
import { KueryBar } from '../KueryBar';

// Header titles with long, unbroken words, like you would see for a long URL in
// a transaction name, with the default `work-break`, don't break, and that ends
// up pushing the date picker off of the screen. Setting `break-all` here lets
// it wrap even if it has a long, unbroken work. The wrapped result is not great
// looking, since it wraps, but it doesn't push any controls off of the screen.
const ChildrenContainerFlexItem = styled(EuiFlexItem)`
  word-break: break-all;
`;

export function ApmHeader({ children }: { children: ReactNode }) {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <ChildrenContainerFlexItem>{children}</ChildrenContainerFlexItem>
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
