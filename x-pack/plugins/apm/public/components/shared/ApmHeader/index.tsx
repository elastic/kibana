/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { EnvironmentFilter } from '../EnvironmentFilter';

const HeaderFlexGroup = styled(EuiFlexGroup)`
  padding: ${({ theme }) => theme.eui.gutterTypes.gutterMedium};
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
`;

export function ApmHeader({ children }: { children: ReactNode }) {
  return (
    <HeaderFlexGroup alignItems="center" gutterSize="s" wrap={true}>
      <EuiFlexItem>{children}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EnvironmentFilter />
      </EuiFlexItem>
    </HeaderFlexGroup>
  );
}
