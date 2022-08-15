/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { take } from 'lodash';
import React from 'react';
import { TopNSubchart } from '../../common/topn';
import { SubChart } from './subchart';

export interface ChartGridProps {
  limit: number;
  charts: TopNSubchart[];
}

function printSubCharts(subcharts: TopNSubchart[], maximum: number) {
  const ncharts = Math.min(maximum, subcharts.length);

  return take(subcharts, ncharts).map((subchart, i) => (
    <EuiFlexItem key={i}>
      <EuiPanel>
        <SubChart
          index={subchart.Index}
          color={subchart.Color}
          category={subchart.Category}
          percentage={subchart.Percentage}
          height={200}
          data={subchart.Series}
        />
      </EuiPanel>
    </EuiFlexItem>
  ));
}

export const ChartGrid: React.FC<ChartGridProps> = ({ limit, charts }) => {
  const maximum = Math.min(limit, charts.length ?? 0);
  return (
    <>
      <EuiSpacer />
      <EuiTitle size="s">
        <h1>Top {charts.length}</h1>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGrid columns={2} gutterSize="m">
        {printSubCharts(charts, maximum)}
      </EuiFlexGrid>
    </>
  );
};
