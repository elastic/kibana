/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
// @ts-ignore
import CustomPlot from 'x-pack/plugins/apm/public/components/shared/charts/CustomPlot';
import {
  ChartGroupRenderProps,
  SyncChartGroup
} from 'x-pack/plugins/apm/public/components/shared/charts/SyncChartGroup';
import { asGB } from 'x-pack/plugins/apm/public/utils/formatters';
import { MemoryChartAPIResponse } from 'x-pack/plugins/apm/server/lib/metrics/get_memory_chart_data/transformer';
import { Coordinate } from 'x-pack/plugins/apm/typings/timeseries';

interface Props {
  data: MemoryChartAPIResponse;
  chartGroupProps?: ChartGroupRenderProps;
}

const MemoryUsageChart: React.SFC<Props> = ({ data, chartGroupProps }) => (
  <SyncChartGroup
    render={syncProps => (
      <React.Fragment>
        <EuiTitle size="s">
          <span>Memory usage</span>
        </EuiTitle>
        <CustomPlot
          {...chartGroupProps || syncProps}
          noHits={data.totalHits === 0}
          series={data.series}
          tickFormatY={(y: number | null) =>
            data.totalHits === 0 ? '- GB' : asGB(y)
          }
          formatTooltipValue={(c: Coordinate) => asGB(c.y)}
        />
      </React.Fragment>
    )}
  />
);

export { MemoryUsageChart };
