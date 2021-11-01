/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Axis,
  BarSeries,
  BarStyleAccessor,
  Chart,
  DomainRange,
  Position,
  ScaleType,
  Settings,
  TickFormatter,
  TooltipType,
} from '@elastic/charts';
import { useChartTheme } from '../../../../../hooks/use_chart_theme';
import { WaterfallChartFixedAxisContainer } from './styles';
import { WaterfallChartMarkers } from './waterfall_markers';

interface Props {
  tickFormat: TickFormatter;
  domain: DomainRange;
  barStyleAccessor: BarStyleAccessor;
}

export const WaterfallChartFixedAxis = ({ tickFormat, domain, barStyleAccessor }: Props) => {
  const theme = useChartTheme();

  return (
    <WaterfallChartFixedAxisContainer>
      <Chart className="axis-only-chart" data-test-subj="axisOnlyChart">
        <Settings
          showLegend={false}
          rotation={90}
          tooltip={{ type: TooltipType.None }}
          theme={theme}
        />

        <Axis
          id="time"
          position={Position.Top}
          tickFormat={tickFormat}
          domain={domain}
          showGridLines={true}
        />

        <BarSeries
          aria-hidden={true}
          id="waterfallItems"
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          y0Accessors={['y0']}
          styleAccessor={barStyleAccessor}
          data={[{ x: 0, y0: 0, y1: 1 }]}
        />
        <WaterfallChartMarkers />
      </Chart>
    </WaterfallChartFixedAxisContainer>
  );
};
