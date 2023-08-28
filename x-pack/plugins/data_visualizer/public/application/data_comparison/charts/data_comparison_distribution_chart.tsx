/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, BarSeries, Chart, Tooltip, Position, ScaleType, Settings } from '@elastic/charts';
import React, { useMemo } from 'react';
import { TickFormatter } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { NoChartsData } from './no_charts_data';
import type { Feature } from '../types';
import { COMPARISON_LABEL, DATA_COMPARISON_TYPE } from '../constants';
import { DataComparisonChartTooltipBody } from '../data_comparison_chart_tooltip_body';

const CHART_HEIGHT = 200;

const defaultFormatter: TickFormatter = (d: unknown) => Number(d).toFixed(2);
export const DataComparisonDistributionChart = ({
  item,
  colors,
}: {
  item: Feature | undefined;
  colors: { referenceColor: string; productionColor: string };
}) => {
  const valueFormatter = useMemo(
    () => (item?.fieldType === DATA_COMPARISON_TYPE.NUMERIC ? defaultFormatter : undefined),
    [item?.fieldType]
  );

  if (!item || item.comparisonDistribution.length === 0) return <NoChartsData />;
  const { featureName, fieldType, comparisonDistribution: data } = item;

  return (
    <div css={{ width: '100%', height: CHART_HEIGHT }}>
      <Chart>
        <Tooltip body={DataComparisonChartTooltipBody} />
        <Settings />
        <Axis
          id="bottom"
          position={Position.Bottom}
          tickFormat={valueFormatter}
          labelFormat={valueFormatter}
        />
        <Axis id="vertical" position={Position.Left} tickFormat={valueFormatter} />
        <BarSeries
          id="data-drift-viz"
          name={featureName}
          xScaleType={
            fieldType === DATA_COMPARISON_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal
          }
          yScaleType={ScaleType.Linear}
          xAccessor="key"
          yAccessors={['percentage']}
          splitSeriesAccessors={['g']}
          data={data}
          color={(identifier) => {
            const key = identifier.seriesKeys[0];
            return key === COMPARISON_LABEL ? colors.productionColor : colors.referenceColor;
          }}
        />
      </Chart>
    </div>
  );
};
