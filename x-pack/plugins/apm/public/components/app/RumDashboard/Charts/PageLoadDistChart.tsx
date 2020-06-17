/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import {
  Axis,
  BrushEndListener,
  Chart,
  CurveType,
  LineSeries,
  ScaleType,
  Settings,
  TooltipValue,
  TooltipValueFormatter,
} from '@elastic/charts';
import { Position } from '@elastic/charts/dist/utils/commons';
import { PercentileAnnotations } from '../PageLoadDistribution/PercentileAnnotations';
import { PageLoadTimeLabel, PercPageLoadedLabel } from '../translations';
import { ChartWrapper } from '../ChartWrapper';
import { BreakdownSeries } from '../PageLoadDistribution/BreakdownSeries';
import { PercentileR } from '../PageLoadDistribution';

interface Props {
  onPercentileChange: (min: number, max: number) => void;
  data: any;
  breakdowns: Map<string, string[]>;
  percentileRange: PercentileR;
  loading: boolean;
}

export const PageLoadDistChart: FC<Props> = ({
  onPercentileChange,
  data,
  breakdowns,
  loading,
  percentileRange,
}) => {
  const onBrushEnd: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [minX, maxX] = x;
    onPercentileChange(minX, maxX);
  };

  const headerFormatter: TooltipValueFormatter = (tooltip: TooltipValue) => {
    return (
      <div>
        <p>{tooltip.value} seconds</p>
      </div>
    );
  };

  const tooltipProps = {
    headerFormatter,
  };

  return (
    <ChartWrapper loading={loading} height="200px">
      <Chart className="story-chart">
        <Settings onBrushEnd={onBrushEnd} tooltip={tooltipProps} showLegend />
        <PercentileAnnotations percentiles={data?.percentiles} />
        <Axis
          id="bottom"
          title={PageLoadTimeLabel}
          position={Position.Bottom}
        />
        <Axis
          id="left"
          title={PercPageLoadedLabel}
          position={Position.Left}
          tickFormat={(d) => Number(d).toFixed(1) + ' %'}
        />
        <LineSeries
          id={'PagesPercentage'}
          name={PercPageLoadedLabel}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          data={data?.pageLoadDistribution ?? []}
          curve={CurveType.CURVE_NATURAL}
        />
        {Array.from(breakdowns.keys()).map((field) => {
          const values = breakdowns.get(field);

          return values?.map((value: string) => {
            return (
              <BreakdownSeries
                key={`${field}-${value}`}
                field={field}
                value={value}
                percentileRange={percentileRange}
              />
            );
          });
        })}
      </Chart>
    </ChartWrapper>
  );
};
