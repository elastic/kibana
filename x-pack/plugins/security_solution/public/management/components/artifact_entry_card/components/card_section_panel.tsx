/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiPanel, EuiPanelProps } from '@elastic/eui';

export type CardSectionPanelProps = Exclude<
  EuiPanelProps,
  'hasBorder' | 'hasShadow' | 'paddingSize'
>;

const StyledEuiPanel = styled(EuiPanel)`
  padding: 32px;
  &.top-section {
    padding-bottom: 24px;
  }
  &.bottom-section {
    padding-top: 24px;
  }
  &.artifact-entry-collapsible-card {
    padding: 24px !important;
  }
`;

export const CardSectionPanel = memo<CardSectionPanelProps>((props) => {
  return <StyledEuiPanel {...props} hasBorder={false} hasShadow={false} paddingSize="l" />;
});
CardSectionPanel.displayName = 'CardSectionPanel';
