/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CurveType, Fit, LineSeries, ScaleType } from '@elastic/charts';
import React, { useEffect } from 'react';
import numeral from '@elastic/numeral';
import {
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
} from '@elastic/eui/dist/eui_charts_theme';
import { PercentileRange } from './index';
import { useBreakdowns } from './use_breakdowns';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';

interface Props {
  field: string;
  value: string;
  percentileRange: PercentileRange;
  onLoadingChange: (loading: boolean) => void;
}

export function BreakdownSeries({
  field,
  value,
  percentileRange,
  onLoadingChange,
}: Props) {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const euiChartTheme = darkMode
    ? EUI_CHARTS_THEME_DARK
    : EUI_CHARTS_THEME_LIGHT;

  const { breakdowns, status } = useBreakdowns({
    field,
    value,
    percentileRange,
  });

  useEffect(() => {
    onLoadingChange(status !== 'success');
  }, [status, onLoadingChange]);

  // sort index 1 color vizColors1 is already used for overall,
  // so don't user that here
  return (
    <>
      {breakdowns.map(({ data: seriesData, name }, sortIndex) => (
        <LineSeries
          id={`${field}-${value}-${name}`}
          key={`${field}-${value}-${name}`}
          name={name}
          xAccessor="x"
          yAccessors={['y']}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          curve={CurveType.CURVE_CATMULL_ROM}
          data={seriesData ?? []}
          lineSeriesStyle={{ point: { visible: false } }}
          fit={Fit.Linear}
          color={
            euiChartTheme.theme.colors?.vizColors?.[
              sortIndex === 0 ? 0 : sortIndex + 1
            ]
          }
          tickFormat={(d) => numeral(d).format('0.0') + ' %'}
        />
      ))}
    </>
  );
}
