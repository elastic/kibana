/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';

const StyledEuiBadge = styled(EuiBadge)`
  .euiBadge__text {
    white-space: pre-wrap !important;
  }
` as unknown as typeof EuiBadge;

interface BadgeListProps {
  badges: string[];
}

export const BadgeList = ({ badges }: BadgeListProps) => (
  <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
    {badges.map((badge: string) => (
      <EuiFlexItem grow={false} key={`badge-${badge}`}>
        <StyledEuiBadge color="hollow">{badge}</StyledEuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
