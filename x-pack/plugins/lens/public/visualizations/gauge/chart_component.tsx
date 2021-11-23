/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Chart, Goal, Settings } from '@elastic/charts';
import { FormattedMessage } from '@kbn/i18n/react';
import type {
  CustomPaletteState,
  ChartsPluginSetup,
  PaletteRegistry,
} from 'src/plugins/charts/public';
import { VisualizationContainer } from '../../visualization_container';
import './index.scss';
import { EmptyPlaceholder } from '../../shared_components';
import { LensIconChartGaugeHorizontal, LensIconChartGaugeVertical } from '../../assets/chart_gauge';
import { getMaxValue, getMinValue, getValueFromAccessor } from './utils';
import {
  GaugeExpressionProps,
  GaugeShapes,
  GaugeTicksPosition,
  GaugeTicksPositions,
  GaugeTitleMode,
} from '../../../common/expressions/gauge_chart';
import type { FormatFactory } from '../../../common';

type GaugeRenderProps = GaugeExpressionProps & {
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  paletteService: PaletteRegistry;
};

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

function getStops(
  { colors, stops, range }: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  if (stops.length) {
    return stops;
  }
  const step = (max - min) / colors.length;
  return colors.map((_, i) => min + i * step);
}

function shiftAndNormalizeStops(
  params: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  const baseStops = [
    ...getStops(params, { min, max }).map((value) => {
      let result = value;
      if (params.range === 'percent' && params.stops.length) {
        result = min + value * ((max - min) / 100);
      }
      // for a range of 1 value the formulas above will divide by 0, so here's a safety guard
      if (Number.isNaN(result)) {
        return 1;
      }
      return result;
    }),
  ];
  if (params.range === 'percent') {
    const convertedMax = min + params.rangeMin * ((max - min) / 100);
    baseStops.push(Math.max(max, convertedMax));
  } else {
    baseStops.push(Math.max(max, ...params.stops));
  }

  if (params.stops.length) {
    if (params.range === 'percent') {
      baseStops.unshift(min + params.rangeMin * ((max - min) / 100));
    } else {
      baseStops.unshift(params.rangeMin);
    }
  }
  return baseStops;
}

function getTitle(visTitleMode: GaugeTitleMode, visTitle?: string, fallbackTitle?: string) {
  if (visTitleMode === 'none') {
    return '';
  } else if (visTitleMode === 'auto') {
    return `${fallbackTitle || ''}   `;
  }
  return `${visTitle || fallbackTitle || ''}   `;
}

// TODO: once charts handle not displaying labels when there's no space for them, it's safe to remove this
function getTicksLabels(baseStops: number[]) {
  const tenPercentRange = (Math.max(...baseStops) - Math.min(...baseStops)) * 0.1;
  const lastIndex = baseStops.length - 1;
  return baseStops.filter((stop, i) => {
    if (i === 0 || i === lastIndex) {
      return true;
    }

    return !(
      stop - baseStops[i - 1] < tenPercentRange || baseStops[lastIndex] - stop < tenPercentRange
    );
  });
}

function getTicks(
  ticksPosition: GaugeTicksPosition,
  range: [number, number],
  colorBands?: number[]
) {
  if (ticksPosition === GaugeTicksPositions.auto) {
    const TICKS_NO = 3;
    const [min, max] = range;
    const step = (max - min) / TICKS_NO;
    return [
      ...Array(TICKS_NO)
        .fill(null)
        .map((_, i) => min + step * i),
      max,
    ];
  } else {
    return colorBands && getTicksLabels(colorBands);
  }
}

export const GaugeComponent: FC<GaugeRenderProps> = ({
  data,
  args,
  formatFactory,
  chartsThemeService,
  paletteService,
}) => {
  const {
    shape: subtype,
    goalAccessor,
    maxAccessor,
    minAccessor,
    metricAccessor,
    palette,
    colorMode,
    subtitle,
    visTitle,
    visTitleMode,
    ticksPosition,
  } = args;

  const chartTheme = chartsThemeService.useChartsTheme();
  const table = Object.values(data.tables)[0];
  const chartData = table.rows.filter((v) => typeof v[metricAccessor!] === 'number');

  if (!metricAccessor) {
    return <VisualizationContainer className="lnsGaugeExpression__container" />;
  }
  const accessors = { maxAccessor, minAccessor, goalAccessor, metricAccessor };

  const row = chartData?.[0];
  const metricValue = getValueFromAccessor('metricAccessor', row, accessors);

  const icon =
    subtype === GaugeShapes.horizontalBullet
      ? LensIconChartGaugeHorizontal
      : LensIconChartGaugeVertical;

  if (typeof metricValue !== 'number') {
    return <EmptyPlaceholder icon={icon} />;
  }

  const goal = getValueFromAccessor('goalAccessor', row, accessors);
  const min = getMinValue(row, accessors);
  const max = getMaxValue(row, accessors);

  if (min === max) {
    return (
      <EmptyPlaceholder
        icon={icon}
        message={
          <FormattedMessage
            id="xpack.lens.guageVisualization.chartCannotRender"
            defaultMessage="Minimum Value is equal to Maximum Value. Chart cannot render."
          />
        }
      />
    );
  }

  const colors = (palette?.params as CustomPaletteState)?.colors ?? undefined;
  const ranges = (palette?.params as CustomPaletteState)
    ? shiftAndNormalizeStops(args.palette?.params as CustomPaletteState, { min, max })
    : [min, max];

  const metricColumn = table.columns.find((col) => col.id === metricAccessor);
  const formatter = formatFactory(
    metricColumn?.meta?.params?.params
      ? metricColumn?.meta?.params
      : {
          id: 'number',
          params: {
            pattern: max - min > 10 ? `0,0` : `0,0.0`,
          },
        }
  );

  return (
    <Chart>
      <Settings debugState={window._echDebugStateFlag ?? false} theme={chartTheme} />
      <Goal
        id="spec_1"
        subtype={subtype}
        base={min}
        target={goal}
        actual={metricValue}
        tickValueFormatter={({ value: tickValue }) => formatter.convert(tickValue)}
        bands={ranges}
        ticks={getTicks(ticksPosition, [min, max], ranges)}
        bandFillColor={(val) => {
          if (colorMode === 'none') {
            return `rgb(255,255,255, 0)`;
          }
          const index = ranges && ranges.indexOf(val.value) - 1;
          return index !== undefined && colors && index >= 0
            ? colors[index]
            : 'rgb(255,255,255, 0)';
        }}
        labelMajor={getTitle(visTitleMode, visTitle, metricColumn?.name)}
        labelMinor={subtitle ? subtitle + '  ' : ''}
      />
    </Chart>
  );
};

export function GaugeChartReportable(props: GaugeRenderProps) {
  return (
    <VisualizationContainer className="lnsGaugeExpression__container">
      <GaugeComponent {...props} />
    </VisualizationContainer>
  );
}
