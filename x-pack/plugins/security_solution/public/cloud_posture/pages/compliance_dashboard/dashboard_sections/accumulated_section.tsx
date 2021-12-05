/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { TotalResourcesChart } from '../compliance_charts/total_resources_chart';
import { FindingsTrendChart } from '../compliance_charts/findings_trend_chart';
import { SectionContainer } from '../../../components/section_container';
import { ChartPanel } from '../../../components/chart_panel';

export const AccumulatedSection = () => (
  <SectionContainer title="Accumulated">
    <EuiFlexGrid columns={2}>
      <EuiFlexItem>
        <ChartPanel
          title="Total Resources"
          description="Since last week"
          chart={TotalResourcesChart}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartPanel
          title="Resources Findings"
          description="Showing: 4,065 Findings"
          chart={FindingsTrendChart}
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  </SectionContainer>
);
