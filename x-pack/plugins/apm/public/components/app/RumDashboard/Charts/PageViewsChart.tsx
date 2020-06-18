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
import moment from 'moment';
import { Position } from '@elastic/charts/dist/utils/commons';
import { DateTimeLabel, PageViewsLabel } from '../translations';
import { formatBigValue } from '../ClientMetrics';
import { history } from '../../../../utils/history';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { ChartWrapper } from '../ChartWrapper';

interface Props {
  data: any;
  loading: boolean;
  breakdowns: Map<string, string[]>;
}

export const PageViewsChart: FC<Props> = ({
  data,
  loading,
  breakdowns,
}: Props) => {
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
      return 'Overall';
    }

    return yAccessor.toString().split?.('__')[1];
  };

  return (
    <ChartWrapper loading={loading} height="200px">
      <Chart>
        <Settings showLegend onBrushEnd={onBrushEnd} />
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
    </ChartWrapper>
  );
};
