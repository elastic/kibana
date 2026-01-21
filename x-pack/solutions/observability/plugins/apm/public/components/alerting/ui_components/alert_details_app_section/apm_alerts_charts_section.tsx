/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

interface Props {
  mainChart: React.ReactNode;
  secondaryCharts: React.ReactNode[];
}

export function ApmAlertsChartsSection({ mainChart, secondaryCharts }: Props) {
  return (
    <EuiFlexItem>
      {mainChart}
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="s">
        {secondaryCharts.map((chart, index) => (
          <EuiFlexItem key={index}>{chart}</EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
