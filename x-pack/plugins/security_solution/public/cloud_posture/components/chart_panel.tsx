/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiPanel, EuiText, EuiTitle } from '@elastic/eui';

interface ChartPanelProps {
  title: string;
  description: string;
  chart: React.FC;
}

export const ChartPanel = ({ title, description, chart: Chart }: ChartPanelProps) => (
  <EuiPanel hasBorder={true}>
    <StyledEuiTitle size="s">
      <h3>{title}</h3>
    </StyledEuiTitle>
    <EuiText size="xs" color="subdued">
      {description}
    </EuiText>
    <Chart />
  </EuiPanel>
);

const StyledEuiTitle = styled(EuiTitle)`
  font-weight: 400;
`;
