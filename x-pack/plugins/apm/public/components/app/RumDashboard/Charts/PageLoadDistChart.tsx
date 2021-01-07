/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import numeral from '@elastic/numeral';
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
  DARK_THEME,
  LIGHT_THEME,
  Fit,
} from '@elastic/charts';
import {
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
} from '@elastic/eui/dist/eui_charts_theme';
import { Position } from '@elastic/charts/dist/utils/commons';
import styled from 'styled-components';
import { PercentileAnnotations } from '../PageLoadDistribution/PercentileAnnotations';
import { I18LABELS } from '../translations';
import { ChartWrapper } from '../ChartWrapper';
import { PercentileRange } from '../PageLoadDistribution';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';
import { BreakdownSeries } from '../PageLoadDistribution/BreakdownSeries';

interface PageLoadData {
  pageLoadDistribution: Array<{ x: number; y: number }>;
  percentiles: Record<string, number | null> | undefined;
  minDuration: number;
  maxDuration: number;
}

interface Props {
  onPercentileChange: (min: number, max: number) => void;
  data?: PageLoadData | null;
  breakdown: BreakdownItem | null;
  percentileRange: PercentileRange;
  loading: boolean;
}

const PageLoadChart = styled(Chart)`
  .echAnnotation {
    pointer-events: initial;
  }
`;

export function PageLoadDistChart({
  onPercentileChange,
  data,
  breakdown,
  loading,
  percentileRange,
}: Props) {
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const onBrushEnd: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [minX, maxX] = x;
    onPercentileChange(minX, maxX);
  };

  // eslint-disable-next-line react/function-component-definition
  const headerFormatter: TooltipValueFormatter = (tooltip: TooltipValue) => {
    return (
      <div>
        <p>
          {tooltip.value} {I18LABELS.seconds}
        </p>
      </div>
    );
  };

  const tooltipProps = {
    headerFormatter,
  };

  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const euiChartTheme = darkMode
    ? EUI_CHARTS_THEME_DARK
    : EUI_CHARTS_THEME_LIGHT;

  return (
    <ChartWrapper loading={loading || breakdownLoading} height="250px">
      {(!loading || data) && (
        <PageLoadChart>
          <Settings
            baseTheme={darkMode ? DARK_THEME : LIGHT_THEME}
            theme={euiChartTheme.theme}
            onBrushEnd={onBrushEnd}
            tooltip={tooltipProps}
            showLegend
          />
          <PercentileAnnotations percentiles={data?.percentiles} />
          <Axis
            id="bottom"
            title={I18LABELS.pageLoadTime}
            position={Position.Bottom}
          />
          <Axis
            id="left"
            title={I18LABELS.percPageLoaded}
            position={Position.Left}
            labelFormat={(d) => d + ' %'}
          />
          <LineSeries
            sortIndex={0}
            fit={Fit.Linear}
            id={'PagesPercentage'}
            name={I18LABELS.overall}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            data={data?.pageLoadDistribution ?? []}
            curve={CurveType.CURVE_CATMULL_ROM}
            lineSeriesStyle={{
              point: { visible: false },
              line: { strokeWidth: 3 },
            }}
            color={euiChartTheme.theme.colors?.vizColors?.[1]}
            tickFormat={(d) => numeral(d).format('0.0') + ' %'}
          />
          {breakdown && (
            <BreakdownSeries
              key={`${breakdown.type}-${breakdown.name}`}
              field={breakdown.type}
              value={breakdown.name}
              percentileRange={percentileRange}
              onLoadingChange={(bLoading) => {
                setBreakdownLoading(bLoading);
              }}
            />
          )}
        </PageLoadChart>
      )}
    </ChartWrapper>
  );
}
