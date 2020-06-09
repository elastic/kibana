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
  Chart,
  niceTimeFormatByDay,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { Position } from '@elastic/charts/dist/utils/commons';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';
import { ChartWrapper } from '../ChartWrapper';

export const ImpressionTrend = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const { data, status } = useFetcher(
    (callApmApi) => {
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
    },
    [end, start, uiFilters]
  );
  const formatter = timeFormatter(niceTimeFormatByDay(2));

  return (
    <div style={{ height: '300px' }}>
      <EuiSpacer size="l" />
      <EuiTitle size="s">
        <h3>Impressions trends</h3>
      </EuiTitle>
      <ChartWrapper loading={status !== 'success'}>
        <Chart className="story-chart">
          <Settings
            showLegend={false}
            showLegendExtra
            legendPosition={Position.Bottom}
          />
          <Axis
            id="horizontal"
            position={Position.Bottom}
            title="Date/Time"
            tickFormat={formatter}
          />
          <Axis
            id="vertical"
            title="Number of impressions"
            position={Position.Left}
          />
          <BarSeries
            id="bars"
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
