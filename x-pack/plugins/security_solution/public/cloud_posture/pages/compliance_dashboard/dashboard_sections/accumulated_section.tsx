/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
  EuiPanel,
  EuiText,
  euiTextSubduedColor,
  euiColorLightShade,
} from '@elastic/eui';
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
