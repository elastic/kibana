/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  AnnotationDomainType,
  Axis,
  BarSeries,
  Chart,
  LineAnnotation,
  LineSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  niceTimeFormatter,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { EvidenceChart as EvidenceChartSpec } from '@kbn/significant-events-schema';

const CHART_HEIGHT = 180;

type YAxisUnit = NonNullable<EvidenceChartSpec['y_axis']['unit']>;

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const formatBytes = (value: number): string => {
  let scaled = Math.abs(value);
  let unitIndex = 0;
  while (scaled >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    scaled /= 1024;
    unitIndex++;
  }
  const sign = value < 0 ? '-' : '';
  return `${sign}${Number(scaled.toFixed(1))} ${BYTE_UNITS[unitIndex]}`;
};

const Y_AXIS_FORMATTERS: Record<YAxisUnit, (value: number) => string> = {
  number: (value) => compactNumber.format(value),
  percent: (value) => `${compactNumber.format(value)}%`,
  bytes: formatBytes,
  ms: (value) => `${compactNumber.format(value)} ms`,
  s: (value) => `${compactNumber.format(value)} s`,
};

interface ChartDatum {
  x: number | string;
  y: number;
}

/** Converts an x value to what the x scale expects; `undefined` when a time value is unparseable. */
const toXValue = (x: string, isTime: boolean): number | string | undefined => {
  if (!isTime) {
    return x;
  }
  const timestamp = Date.parse(x);
  return Number.isNaN(timestamp) ? undefined : timestamp;
};

export interface EvidenceChartProps {
  chart: EvidenceChartSpec;
}

/**
 * Renders the static chart spec an investigation attaches to a piece of evidence. The data points
 * travel with the spec, so the chart looks the same regardless of where the data came from.
 */
export const EvidenceChart: React.FC<EvidenceChartProps> = ({ chart }) => {
  const { euiTheme } = useEuiTheme();
  const baseTheme = useElasticChartsTheme();
  const isTime = chart.x_axis.type === 'time';
  const yFormatter = Y_AXIS_FORMATTERS[chart.y_axis.unit ?? 'number'];

  const series = useMemo(
    () =>
      chart.series.map((entry, index) => ({
        id: `series-${index}`,
        name: entry.name,
        data: entry.points.reduce<ChartDatum[]>((data, { x, y }) => {
          const xValue = toXValue(x, isTime);
          if (xValue !== undefined && Number.isFinite(y)) {
            data.push({ x: xValue, y });
          }
          return data;
        }, []),
      })),
    [chart.series, isTime]
  );

  const xFormatter = useMemo(() => {
    if (!isTime) {
      return undefined;
    }
    const timestamps = series.flatMap(({ data }) => data.map(({ x }) => x as number));
    return timestamps.length > 0
      ? niceTimeFormatter([Math.min(...timestamps), Math.max(...timestamps)])
      : undefined;
  }, [isTime, series]);

  const { pointAnnotations, rangeAnnotations } = useMemo(() => {
    const points: Array<{ dataValue: number | string; details: string }> = [];
    const ranges: Array<{
      coordinates: { x0: number | string; x1: number | string };
      details: string;
    }> = [];
    for (const annotation of chart.annotations ?? []) {
      const start = toXValue(annotation.x, isTime);
      if (start === undefined) {
        continue;
      }
      const end = annotation.x_end ? toXValue(annotation.x_end, isTime) : undefined;
      if (end !== undefined) {
        ranges.push({ coordinates: { x0: start, x1: end }, details: annotation.label });
      } else {
        points.push({ dataValue: start, details: annotation.label });
      }
    }
    return { pointAnnotations: points, rangeAnnotations: ranges };
  }, [chart.annotations, isTime]);

  const xScaleType = isTime ? ScaleType.Time : ScaleType.Ordinal;
  const hasData = series.some(({ data }) => data.length > 0);
  const showLegend = series.length > 1;
  // Series take the theme's palette colors in order, so the legend can be rendered with EUI and
  // wrap freely in a narrow flyout instead of competing with the plot for a fixed height.
  const seriesColors = baseTheme.colors.vizColors;

  return (
    <div data-test-subj="investigationEvidenceChart">
      <EuiText size="xs">
        <strong>{chart.title}</strong>
      </EuiText>
      {hasData && (
        <>
          <EuiSpacer size="xs" />
          <Chart size={{ height: CHART_HEIGHT }}>
            <Settings baseTheme={baseTheme} showLegend={false} />
            <Axis
              id="x"
              position={Position.Bottom}
              title={chart.x_axis.label}
              tickFormat={xFormatter}
            />
            <Axis
              id="y"
              position={Position.Left}
              title={chart.y_axis.label}
              tickFormat={yFormatter}
              ticks={4}
              gridLine={{ visible: true }}
            />
            {series.map(({ id, name, data }, index) =>
              chart.type === 'bar' ? (
                <BarSeries
                  key={id}
                  id={id}
                  name={name}
                  color={seriesColors[index % seriesColors.length]}
                  data={data}
                  xAccessor="x"
                  yAccessors={['y']}
                  xScaleType={xScaleType}
                  yScaleType={ScaleType.Linear}
                  stackAccessors={chart.stacked ? ['x'] : undefined}
                />
              ) : (
                <LineSeries
                  key={id}
                  id={id}
                  name={name}
                  color={seriesColors[index % seriesColors.length]}
                  data={data}
                  xAccessor="x"
                  yAccessors={['y']}
                  xScaleType={xScaleType}
                  yScaleType={ScaleType.Linear}
                />
              )
            )}
            {pointAnnotations.length > 0 && (
              <LineAnnotation
                id="evidence-point-annotations"
                domainType={AnnotationDomainType.XDomain}
                dataValues={pointAnnotations}
                marker={<EuiIcon type="dot" color={euiTheme.colors.accent} aria-hidden={true} />}
                markerPosition={Position.Top}
                style={{ line: { strokeWidth: 1, stroke: euiTheme.colors.accent, opacity: 1 } }}
              />
            )}
            {rangeAnnotations.length > 0 && (
              <RectAnnotation
                id="evidence-range-annotations"
                dataValues={rangeAnnotations}
                style={{ fill: euiTheme.colors.accent, opacity: 0.1 }}
              />
            )}
          </Chart>
          {showLegend && (
            <EuiFlexGroup
              gutterSize="s"
              wrap
              css={css`
                margin-top: ${euiTheme.size.s};
              `}
              responsive={false}
              data-test-subj="investigationEvidenceChartLegend"
            >
              {series.map(({ id, name }, index) => (
                <EuiFlexItem key={id} grow={false}>
                  <EuiHealth color={seriesColors[index % seriesColors.length]} textSize="xs">
                    {name}
                  </EuiHealth>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </>
      )}
    </div>
  );
};
