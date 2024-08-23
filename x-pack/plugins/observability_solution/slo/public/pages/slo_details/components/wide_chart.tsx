/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  Fit,
  LineSeries,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiIcon, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import moment from 'moment';
import React, { useRef } from 'react';

import { i18n } from '@kbn/i18n';
import { useAnnotations } from '@kbn/observability-plugin/public';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { getBrushTimeBounds } from '../../../utils/slo/duration';
import { TimeBounds } from '../types';
import { useKibana } from '../../../utils/kibana_react';
import { ChartData } from '../../../typings';

type ChartType = 'area' | 'line';
type State = 'success' | 'error';

export interface Props {
  id: string;
  data: ChartData[];
  chart: ChartType;
  state: State;
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function WideChart({ chart, data, id, isLoading, state, onBrushed, slo }: Props) {
  const { charts, uiSettings } = useKibana().services;
  const baseTheme = charts.theme.useChartsBaseTheme();
  const { euiTheme } = useEuiTheme();
  const dateFormat = uiSettings.get('dateFormat');
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const color = state === 'error' ? euiTheme.colors.danger : euiTheme.colors.success;
  const ChartComponent = chart === 'area' ? AreaSeries : LineSeries;

  const { ObservabilityAnnotations, annotations, onAnnotationClick, wrapOnBrushEnd } =
    useAnnotations({
      slo,
      domain: {
        min: 'now-30d',
        max: 'now',
      },
    });

  const chartRef = useRef(null);
  const handleCursorUpdate = useActiveCursor(charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });

  if (isLoading) {
    return <EuiLoadingChart size="m" mono data-test-subj="wideChartLoading" />;
  }

  return (
    <Chart size={{ height: 200, width: '100%' }} ref={chartRef}>
      <ObservabilityAnnotations annotations={annotations} />
      <Settings
        theme={{
          chartMargins: { top: 30 },
        }}
        baseTheme={baseTheme}
        showLegend={false}
        noResults={
          <EuiIcon
            type="visualizeApp"
            size="l"
            color="subdued"
            title={i18n.translate('xpack.slo.wideChart.euiIcon.noResultsLabel', {
              defaultMessage: 'no results',
            })}
          />
        }
        onPointerUpdate={handleCursorUpdate}
        externalPointerEvents={{
          tooltip: { visible: true },
        }}
        pointerUpdateDebounce={0}
        pointerUpdateTrigger={'x'}
        locale={i18n.getLocale()}
        onBrushEnd={wrapOnBrushEnd((brushArea) => {
          onBrushed?.(getBrushTimeBounds(brushArea));
        })}
        onAnnotationClick={onAnnotationClick}
      />
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={(d) => moment(d).format(dateFormat)}
      />
      <Axis
        id="left"
        ticks={4}
        position={Position.Left}
        tickFormat={(d) => numeral(d).format(percentFormat)}
        domain={{
          fit: true,
          min: NaN,
          max: NaN,
        }}
      />
      <ChartComponent
        color={color}
        data={data}
        fit={Fit.Nearest}
        id={id}
        lineSeriesStyle={{
          line: {
            strokeWidth: 1,
          },
          point: { visible: false },
        }}
        xAccessor="key"
        xScaleType={ScaleType.Time}
        yAccessors={['value']}
        yScaleType={ScaleType.Linear}
        yNice
      />
    </Chart>
  );
}
