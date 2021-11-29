/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPanel, EuiText, EuiTitle, euiTextSubduedColor } from '@elastic/eui';

interface ChartPanelProps {
  title: string;
  description: string;
  chart: React.FC;
}

export const ChartPanel = ({ title, description, chart: Chart }: ChartPanelProps) => (
  <EuiPanel hasBorder={true}>
    <EuiTitle size="s" style={{ fontWeight: 400 }}>
      <h3>{title}</h3>
    </EuiTitle>
    <EuiText size="xs" color={euiTextSubduedColor}>
      {description}
    </EuiText>
    <Chart />
  </EuiPanel>
);
