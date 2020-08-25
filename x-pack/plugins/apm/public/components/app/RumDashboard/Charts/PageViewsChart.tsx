/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  BrushEndListener,
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  niceTimeFormatByDay,
  ScaleType,
  SeriesNameFn,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { Position } from '@elastic/charts/dist/utils/commons';
import {
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
} from '@elastic/eui/dist/eui_charts_theme';
import numeral from '@elastic/numeral';
import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { ChartWrapper } from '../ChartWrapper';
import { I18LABELS } from '../translations';

interface Props {
  data?: Array<Record<string, number | null>>;
  loading: boolean;
}

export function PageViewsChart({ data, loading }: Props) {
  const history = useHistory();
  const { urlParams } = useUrlParams();

  const { start, end } = urlParams;
  const diffInDays = moment(new Date(end as string)).diff(
    moment(new Date(start as string)),
    'day'
  );

  const formatter = timeFormatter(niceTimeFormatByDay(diffInDays > 1 ? 2 : 1));

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

  let breakdownAccessors: Set<string> = new Set();
  if (data && data.length > 0) {
    data.forEach((item) => {
      breakdownAccessors = new Set([
        ...Array.from(breakdownAccessors),
        ...Object.keys(item).filter((key) => key !== 'x'),
      ]);
    });
  }

  const customSeriesNaming: SeriesNameFn = ({ yAccessor }) => {
    if (yAccessor === 'y') {
      return I18LABELS.overall;
    }

    return yAccessor;
  };

  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ChartWrapper loading={loading} height="250px">
      {(!loading || data) && (
        <Chart>
          <Settings
            baseTheme={darkMode ? DARK_THEME : LIGHT_THEME}
            theme={
              darkMode
                ? EUI_CHARTS_THEME_DARK.theme
                : EUI_CHARTS_THEME_LIGHT.theme
            }
            showLegend
            onBrushEnd={onBrushEnd}
            xDomain={{
              min: new Date(start as string).valueOf(),
              max: new Date(end as string).valueOf(),
            }}
          />
          <Axis
            id="date_time"
            position={Position.Bottom}
            tickFormat={formatter}
          />
          <Axis
            id="page_views"
            title={I18LABELS.pageViews}
            position={Position.Left}
            tickFormat={(d) => numeral(d).format('0a')}
          />
          <BarSeries
            id={I18LABELS.pageViews}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={Array.from(breakdownAccessors)}
            data={data ?? []}
            name={customSeriesNaming}
          />
        </Chart>
      )}
    </ChartWrapper>
  );
}
