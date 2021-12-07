/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Chart, Goal, Settings } from '@elastic/charts';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  CustomPaletteState,
  ChartsPluginSetup,
  PaletteRegistry,
} from 'src/plugins/charts/public';
import { VisualizationContainer } from '../../visualization_container';
import './index.scss';
import { LensIconChartGaugeHorizontal, LensIconChartGaugeVertical } from '../../assets/chart_gauge';
import { EmptyPlaceholder } from '../../../../../../src/plugins/charts/public';
import { getMaxValue, getMinValue, getValueFromAccessor } from './utils';
import {
  GaugeExpressionProps,
  GaugeShapes,
  GaugeTicksPosition,
  GaugeTicksPositions,
  GaugeLabelMajorMode,
} from '../../../common/expressions/gauge_chart';
import type { FormatFactory } from '../../../common';

export type GaugeRenderProps = GaugeExpressionProps & {
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

function normalizeColors({ colors, stops, range }: CustomPaletteState, min: number) {
  if (!colors) {
    return;
  }
  const colorsOutOfRangeSmaller = Math.max(
    stops.filter((stop, i) => (range === 'percent' ? stop < 0 : stop < min)).length,
    0
  );
  return colors.slice(colorsOutOfRangeSmaller);
}

function normalizeBands(
  { colors, stops, range }: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  if (!stops.length) {
    const step = (max - min) / colors.length;
    return [min, ...colors.map((_, i) => min + (i + 1) * step)];
  }
  if (range === 'percent') {
    const filteredStops = stops.filter((stop) => stop >= 0 && stop <= 100);
    return [min, ...filteredStops.map((step) => min + step * ((max - min) / 100)), max];
  }
  const orderedStops = stops.filter((stop, i) => stop < max && stop > min);
  return [min, ...orderedStops, max];
}

function getTitle(
  labelMajorMode: GaugeLabelMajorMode,
  labelMajor?: string,
  fallbackTitle?: string
) {
  if (labelMajorMode === 'none') {
    return '';
  } else if (labelMajorMode === 'auto') {
    return `${fallbackTitle || ''}   `;
  }
  return `${labelMajor || fallbackTitle || ''}   `;
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
  if (ticksPosition === GaugeTicksPositions.bands && colorBands) {
    return colorBands && getTicksLabels(colorBands);
  }
  const TICKS_NO = 3;
  const min = Math.min(...(colorBands || []), ...range);
  const max = Math.max(...(colorBands || []), ...range);
  const step = (max - min) / TICKS_NO;
  return [
    ...Array(TICKS_NO)
      .fill(null)
      .map((_, i) => Number((min + step * i).toFixed(2))),
    max,
  ];
}

export const GaugeComponent: FC<GaugeRenderProps> = ({
  data,
  args,
  formatFactory,
  chartsThemeService,
}) => {
  const {
    shape: subtype,
    metricAccessor,
    palette,
    colorMode,
    labelMinor,
    labelMajor,
    labelMajorMode,
    ticksPosition,
  } = args;
  if (!metricAccessor) {
    return <VisualizationContainer className="lnsGaugeExpression__container" />;
  }

  const chartTheme = chartsThemeService.useChartsTheme();

  const table = Object.values(data.tables)[0];
  const metricColumn = table.columns.find((col) => col.id === metricAccessor);

  const chartData = table.rows.filter(
    (v) => typeof v[metricAccessor!] === 'number' || Array.isArray(v[metricAccessor!])
  );
  const row = chartData?.[0];

  const metricValue = getValueFromAccessor('metricAccessor', row, args);

  const icon =
    subtype === GaugeShapes.horizontalBullet
      ? LensIconChartGaugeHorizontal
      : LensIconChartGaugeVertical;

  if (typeof metricValue !== 'number') {
    return <EmptyPlaceholder icon={icon} />;
  }

  const goal = getValueFromAccessor('goalAccessor', row, args);
  const min = getMinValue(row, args);
  const max = getMaxValue(row, args);

  if (min === max) {
    return (
      <EmptyPlaceholder
        icon={icon}
        message={
          <FormattedMessage
            id="xpack.lens.guageVisualization.chartCannotRenderEqual"
            defaultMessage="Minimum and maximum values may not be equal"
          />
        }
      />
    );
  } else if (min > max) {
    return (
      <EmptyPlaceholder
        icon={icon}
        message={
          <FormattedMessage
            id="xpack.lens.guageVisualization.chartCannotRenderMinGreaterMax"
            defaultMessage="Minimum value may not be greater than maximum value"
          />
        }
      />
    );
  }

  const tickFormatter = formatFactory(
    metricColumn?.meta?.params?.params
      ? metricColumn?.meta?.params
      : {
          id: 'number',
          params: {
            pattern: max - min > 5 ? `0,0` : `0,0.0`,
          },
        }
  );
  const colors = palette?.params?.colors ? normalizeColors(palette.params, min) : undefined;
  const bands: number[] = (palette?.params as CustomPaletteState)
    ? normalizeBands(args.palette?.params as CustomPaletteState, { min, max })
    : [min, max];

  // TODO: format in charts
  const formattedActual = Math.round(Math.min(Math.max(metricValue, min), max) * 1000) / 1000;

  return (
    <Chart>
      <Settings debugState={window._echDebugStateFlag ?? false} theme={chartTheme} />
      <Goal
        id="goal"
        subtype={subtype}
        base={min}
        target={goal && goal >= min && goal <= max ? goal : undefined}
        actual={formattedActual}
        tickValueFormatter={({ value: tickValue }) => tickFormatter.convert(tickValue)}
        bands={bands}
        ticks={getTicks(ticksPosition, [min, max], bands)}
        bandFillColor={
          colorMode === 'palette' && colors
            ? (val) => {
                const index = bands && bands.indexOf(val.value) - 1;
                return colors && index >= 0 && colors[index]
                  ? colors[index]
                  : colors[colors.length - 1];
              }
            : () => `rgba(255,255,255,0)`
        }
        labelMajor={getTitle(labelMajorMode, labelMajor, metricColumn?.name)}
        labelMinor={labelMinor ? labelMinor + '  ' : ''}
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
