/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  BrushEndListener,
  Chart,
  niceTimeFormatByDay,
  ScaleType,
  SeriesNameFn,
  timeFormatter,
  Position,
} from '@elastic/charts';
import numeral from '@elastic/numeral';
import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { ApmPluginStartDeps } from '../../../../plugin';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { ChartWrapper } from '../ChartWrapper';
import { I18LABELS } from '../translations';

interface Props {
  data?: {
    topItems: string[];
    items: Array<Record<string, number | null>>;
  };
  loading: boolean;
}

export function PageViewsChart({ data, loading }: Props) {
  const { services: { charts: { SharedChartSettings, theme } } } = useKibana<ApmPluginStartDeps>();
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

  const hasBreakdowns = !!data?.topItems?.length;

  const breakdownAccessors = data?.topItems?.length ? data?.topItems : ['y'];

  const customSeriesNaming: SeriesNameFn = ({ yAccessor }) => {
    if (yAccessor === 'y') {
      return I18LABELS.overall;
    }

    return yAccessor;
  };

  return (
    <ChartWrapper loading={loading} height="250px">
      {(!loading || data) && (
        <Chart>
          <SharedChartSettings
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
            tickFormat={(d) => numeral(d).format('0')}
            labelFormat={(d) => numeral(d).format('0a')}
          />
          <BarSeries
            id={I18LABELS.pageViews}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={Array.from(breakdownAccessors)}
            stackAccessors={['x']}
            data={data?.items ?? []}
            name={customSeriesNaming}
            color={
              !hasBreakdowns
                ? theme.useChartsTheme().colors?.vizColors?.[1]
                : undefined
            }
          />
        </Chart>
      )}
    </ChartWrapper>
  );
}
