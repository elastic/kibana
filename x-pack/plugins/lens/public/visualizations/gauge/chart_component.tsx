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

function normalizeBands(
  { colors, stops, range }: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  if (!stops.length) {
    const step = (max - min) / colors.length;
    return [min, ...colors.map((_, i) => min + (i + 1) * step)];
  }
  if (range === 'percent') {
    return [min, ...stops.map((step) => min + step * ((max - min) / 100))];
  }

  if (max >= Math.max(...stops)) {
    // the max value has changed but the palette has outdated information
    const updatedStops = [...stops.slice(0, -1), max];
    return [min, ...updatedStops];
  } else {
    return [min, ...stops.slice(0, -1)];
  }
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
    const min = Math.min(...(colorBands || []), ...range);
    const max = Math.max(...(colorBands || []), ...range);
    const step = (max - min) / TICKS_NO;
    return [
      ...Array(TICKS_NO)
        .fill(null)
        .map((_, i) => Number((min + step * i).toFixed(2))),
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
}) => {
  const {
    shape: subtype,
    metricAccessor,
    palette,
    colorMode,
    subtitle,
    visTitle,
    visTitleMode,
    ticksPosition,
  } = args;
  if (!metricAccessor) {
    return <VisualizationContainer className="lnsGaugeExpression__container" />;
  }

  const chartTheme = chartsThemeService.useChartsTheme();

  const table = Object.values(data.tables)[0];
  const metricColumn = table.columns.find((col) => col.id === metricAccessor);

  const chartData = table.rows.filter((v) => typeof v[metricAccessor!] === 'number');
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
            id="xpack.lens.guageVisualization.chartCannotRender"
            defaultMessage="Minimum Value is equal to Maximum Value. Chart cannot render."
          />
        }
      />
    );
  }

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
  const colors = (palette?.params as CustomPaletteState)?.colors ?? undefined;
  const bands = (palette?.params as CustomPaletteState)
    ? normalizeBands(args.palette?.params as CustomPaletteState, { min, max })
    : [min, max];

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
        bands={bands}
        ticks={getTicks(ticksPosition, [min, max], bands)}
        bandFillColor={
          colorMode === 'palette'
            ? (val) => {
                const index = bands && bands.indexOf(val.value) - 1;
                return colors && index >= 0 && colors[index]
                  ? colors[index]
                  : colors[colors.length - 1];
              }
            : undefined
        }
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
