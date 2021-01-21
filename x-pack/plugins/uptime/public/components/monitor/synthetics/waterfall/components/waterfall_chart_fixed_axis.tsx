/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

interface Props {
  tickFormat: TickFormatter;
  domain: DomainRange;
  barStyleAccessor: BarStyleAccessor;
}

export const WaterfallChartFixedAxis = ({ tickFormat, domain, barStyleAccessor }: Props) => {
  const theme = useChartTheme();

  return (
    <WaterfallChartFixedAxisContainer>
      <Chart className="axis-only-chart">
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
          style={{
            axisLine: {
              visible: false,
            },
          }}
        />

        <BarSeries
          id="waterfallItems"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          y0Accessors={['y0']}
          styleAccessor={barStyleAccessor}
          data={[{ x: 0, y0: 0, y1: 0 }]}
        />
      </Chart>
    </WaterfallChartFixedAxisContainer>
  );
};
