/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import {
  Axis,
  BarSeries,
  BrushEndListener,
  Chart,
  niceTimeFormatByDay,
  ScaleType,
  SeriesNameFn,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { DARK_THEME, LIGHT_THEME, PartialTheme, Theme } from '@elastic/charts';

import {
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
} from '@elastic/eui/dist/eui_charts_theme';
import moment from 'moment';
import { Position } from '@elastic/charts/dist/utils/commons';
import { DateTimeLabel, OverallLabel, PageViewsLabel } from '../translations';
import { formatBigValue } from '../ClientMetrics';
import { history } from '../../../../utils/history';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { ChartWrapper } from '../ChartWrapper';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';

interface Props {
  data: any;
  loading: boolean;
}

export const PageViewsChart: FC<Props> = ({ data, loading }: Props) => {
  const formatter = timeFormatter(niceTimeFormatByDay(2));

  const onBrushEnd: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [minX, maxX] = x;

    const rangeFrom = moment(minX).toISOString();
    const rangeTo = moment(maxX).toISOString();

    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        rangeFrom,
        rangeTo,
      }),
    });
  };

  let breakdownAccessors: string[] = [];
  if (data && data.length > 0) {
    const allKeys = Object.keys(data[0]);
    breakdownAccessors = allKeys.filter((key) => key !== 'x');
  }

  const customSeriesNaming: SeriesNameFn = ({ yAccessor }) => {
    if (yAccessor === 'y') {
      return OverallLabel;
    }

    return yAccessor.toString().split?.('__')[1];
  };

  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ChartWrapper loading={loading} height="200px">
      {(!loading || data) && (
        <Chart size={{ height: 200 }}>
          <Settings
            baseTheme={darkMode ? DARK_THEME : LIGHT_THEME}
            theme={
              darkMode
                ? EUI_CHARTS_THEME_DARK.theme
                : EUI_CHARTS_THEME_LIGHT.theme
            }
            showLegend
            onBrushEnd={onBrushEnd}
          />
          <Axis
            id="date_time"
            position={Position.Bottom}
            title={DateTimeLabel}
            tickFormat={formatter}
          />
          <Axis
            id="page_views"
            title={PageViewsLabel}
            position={Position.Left}
            tickFormat={(d) => formatBigValue(Number(d))}
          />
          <BarSeries
            id={PageViewsLabel}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={breakdownAccessors}
            data={data ?? []}
            name={customSeriesNaming}
          />
        </Chart>
      )}
    </ChartWrapper>
  );
};
