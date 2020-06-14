/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @flow
import * as React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  Axis,
  BarSeries,
  BrushEndListener,
  Chart,
  niceTimeFormatByDay,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import moment from 'moment';
import { Position } from '@elastic/charts/dist/utils/commons';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';
import { ChartWrapper } from '../ChartWrapper';
import {
  DateTimeLabel,
  ImpressionsTrendsLabel,
  NoOfImpressionsLabels,
} from '../translations';
import { history } from '../../../../utils/history';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { formatBigValue } from '../ClientMetrics';

export const ImpressionTrend = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/rum-client/impression-trend',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [end, start, uiFilters]
  );
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

  return (
    <div>
      <EuiSpacer size="l" />
      <EuiTitle size="s">
        <h3>{ImpressionsTrendsLabel}</h3>
      </EuiTitle>
      <ChartWrapper loading={status !== 'success'} height="300px">
        <Chart>
          <Settings
            showLegend={false}
            showLegendExtra
            legendPosition={Position.Bottom}
            onBrushEnd={onBrushEnd}
          />
          <Axis
            id="date_time"
            position={Position.Bottom}
            title={DateTimeLabel}
            tickFormat={formatter}
          />
          <Axis
            id="number_of_impressions"
            title={NoOfImpressionsLabels}
            position={Position.Left}
            tickFormat={(d) => formatBigValue(Number(d))}
          />
          <BarSeries
            id={NoOfImpressionsLabels}
            color={[euiLightVars.euiColorLightShade]}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={data ?? []}
          />
        </Chart>
      </ChartWrapper>
    </div>
  );
};
