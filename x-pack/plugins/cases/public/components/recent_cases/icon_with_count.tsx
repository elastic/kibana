/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import type { Property } from 'csstype';
import React from 'react';
import styled from 'styled-components';

type IconColor =
  | 'default'
  | 'subdued'
  | 'success'
  | 'accent'
  | 'danger'
  | 'warning'
  | 'ghost'
  | Property.Color
  | undefined;

const Icon = styled(EuiIcon)`
  margin-right: 8px;
`;

const FlexGroup = styled(EuiFlexGroup)`
  margin-right: 16px;
`;
const OuterContainer = styled.span`
  width: fit-content;
`;
export const IconWithCount = React.memo<{
  count: number;
  icon: string;
  tooltip: string;
  color?: IconColor;
}>(({ count, icon, tooltip, color }) => (
  <OuterContainer>
    <EuiToolTip content={tooltip}>
      <FlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <Icon color={color ?? 'subdued'} size="s" type={icon} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText color={color ?? 'subdued'} size="xs">
            {count}
          </EuiText>
        </EuiFlexItem>
      </FlexGroup>
    </EuiToolTip>
  </OuterContainer>
));

IconWithCount.displayName = 'IconWithCount';
