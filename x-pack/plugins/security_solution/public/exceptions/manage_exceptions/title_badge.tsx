/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

interface TitleBadgeProps {
  title: string;
  badgeString: string;
}

const StyledFlexItem = styled(EuiFlexItem)`
  border-right: 1px solid #d3dae6;
  padding: 4px 12px 4px 0;
`;
export const TitleBadge = memo<TitleBadgeProps>(({ title, badgeString }) => {
  return (
    <EuiFlexItem style={{ flex: '1 1 auto' }}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>{title}</EuiText>
        </EuiFlexItem>
        <StyledFlexItem grow={false}>
          <EuiBadge>{badgeString}</EuiBadge>{' '}
        </StyledFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
});

TitleBadge.displayName = 'TitleBadge';
