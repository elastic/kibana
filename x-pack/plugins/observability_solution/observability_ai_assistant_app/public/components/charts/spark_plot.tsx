/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  BarSeries,
  Chart,
  CurveType,
  LineSeries,
  PartialTheme,
  ScaleType,
  Settings,
  Tooltip,
  LineAnnotation,
  AnnotationDomainType,
  Position,
} from '@elastic/charts';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useChartTheme } from '../../hooks/use_chart_theme';

export function SparkPlot({
  type,
  timeseries,
  annotations,
}: {
  type: 'line' | 'bar';
  timeseries: Array<{ x: number; y: number | null }>;
  annotations?: Array<{
    id: string;
    x: number;
    color: string;
    icon: React.ReactNode;
    label: string;
  }>;
}) {
  const defaultChartTheme = useChartTheme();

  const sparkplotChartTheme: PartialTheme = {
    chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
    chartPaddings: {
      top: 12,
      bottom: 12,
    },
    lineSeriesStyle: {
      point: { opacity: 0 },
    },
    areaSeriesStyle: {
      point: { opacity: 0 },
    },
  };

  return (
    <Chart
      size={{
        width: 128,
        height: 64,
      }}
    >
      <Settings
        theme={[sparkplotChartTheme, ...defaultChartTheme.theme]}
        baseTheme={defaultChartTheme.baseTheme}
        showLegend={false}
        locale={i18n.getLocale()}
      />
      <Tooltip type="none" />
      {type && type === 'bar' ? (
        <BarSeries
          id="Sparkbar"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={timeseries}
        />
      ) : (
        <LineSeries
          id="Sparkline"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          data={timeseries}
          curve={CurveType.CURVE_MONOTONE_X}
        />
      )}
      {annotations?.map((annotation) => {
        return (
          <LineAnnotation
            id={annotation.id}
            dataValues={[{ dataValue: annotation.x, header: annotation.label }]}
            domainType={AnnotationDomainType.XDomain}
            marker={annotation.icon}
            markerPosition={Position.Bottom}
            style={{
              line: {
                strokeWidth: 2,
                stroke: annotation.color,
              },
            }}
          />
        );
      })}
    </Chart>
  );
}
