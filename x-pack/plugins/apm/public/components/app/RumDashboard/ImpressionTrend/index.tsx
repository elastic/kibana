/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @flow
import * as React from 'react';
import { EuiSpacer, EuiStat } from '@elastic/eui';
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

export const ImpressionTrend = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { serviceName, start, end } = urlParams;

  const { data } = useFetcher((callApmApi) => {
    return callApmApi({
      pathname: '/api/apm/rum-client/impression-trend',
      params: {
        // path: {
        //   serviceName,
        // },
        query: {
          // start,
          // end,
          // uiFilters: JSON.stringify(uiFilters),
        },
      },
    });
  }, []);
  const formatter = timeFormatter(niceTimeFormatByDay(2));

  return (
    <div style={{ height: '400px' }}>
      <EuiSpacer size="l" />
      <Chart className="story-chart">
        <Settings
          showLegend={false}
          showLegendExtra
          legendPosition={Position.Bottom}
        />
        <Axis
          id="horizontal"
          position={Position.Bottom}
          title="x-domain axis"
          tickFormat={formatter}
        />
        <Axis id="vertical" title="y-domain axis" position={Position.Left} />
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
    </div>
  );
};
