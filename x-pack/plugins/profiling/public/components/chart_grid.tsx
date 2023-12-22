/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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
            onClick={
              onChartClick
                ? () => {
                    onChartClick(subchart);
                  }
                : undefined
            }
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
      <EuiTitle size="s">
        <h1>
          {i18n.translate('xpack.profiling.chartGrid.h1.topLabel', {
            defaultMessage: 'Top {size}',
            values: { size: charts.length },
          })}
        </h1>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGrid columns={2} gutterSize="m">
        {subCharts}
      </EuiFlexGrid>
    </>
  );
}
