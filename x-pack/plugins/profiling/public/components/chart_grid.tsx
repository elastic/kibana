/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { take } from 'lodash';
import React, { useMemo } from 'react';
import { TopNSubchart } from '../../common/topn';
import { SubChart } from './subchart';

export interface ChartGridProps {
  limit: number;
  charts: TopNSubchart[];
  showFrames: boolean;
  onChartClick?: (selectedChart: TopNSubchart) => void;
}

export function ChartGrid({ limit, charts, showFrames, onChartClick }: ChartGridProps) {
  const maximum = Math.min(limit, charts.length ?? 0);
  const ncharts = Math.min(maximum, charts.length);

  const subCharts = useMemo(() => {
    return take(charts, ncharts).map((subchart) => (
      <EuiFlexItem key={subchart.Category}>
        <EuiPanel paddingSize="none">
          <SubChart
            index={subchart.Index}
            color={subchart.Color}
            category={subchart.Category}
            label={subchart.Label}
            percentage={subchart.Percentage}
            metadata={subchart.Metadata}
            height={200}
            data={subchart.Series}
            sample={null}
            showAxes
            onClick={onChartClick ? () => onChartClick(subchart) : undefined}
            showFrames={showFrames}
            padTitle
          />
        </EuiPanel>
      </EuiFlexItem>
    ));
  }, [charts, ncharts, onChartClick, showFrames]);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGrid columns={2} gutterSize="m">
        {subCharts}
      </EuiFlexGrid>
    </>
  );
}
