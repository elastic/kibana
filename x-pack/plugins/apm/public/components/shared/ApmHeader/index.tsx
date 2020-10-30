/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { px, units } from '../../../style/variables';
import { DatePicker } from '../DatePicker';
import { EnvironmentFilter } from '../EnvironmentFilter';
import { KueryBar } from '../KueryBar';

const unit = px(units.unit);

const ApmHeaderContainer = styled(EuiFlexGroup)`
  padding: ${unit} ${unit} 0 ${unit};
`;

export function ApmHeader({ children }: { children: ReactNode }) {
  return (
    <>
      <ApmHeaderContainer alignItems="center" gutterSize="s" wrap={true}>
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EnvironmentFilter />
        </EuiFlexItem>
      </ApmHeaderContainer>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="s"
        style={
          {
            padding: `0 ${unit}`,
          } /* This will be replaced in #81723 */
        }
      >
        <EuiFlexItem grow={3}>
          <KueryBar />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <DatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
