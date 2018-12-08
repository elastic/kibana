/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
// @ts-ignore
import CustomPlot from 'x-pack/plugins/apm/public/components/shared/charts/CustomPlot';
import { SyncChartGroup } from 'x-pack/plugins/apm/public/components/shared/charts/SyncChartGroup';
import { MemoryChartDataRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/serviceMetricsCharts';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { asGB } from 'x-pack/plugins/apm/public/utils/formatters';
import { Coordinate } from 'x-pack/plugins/apm/typings/timeseries';

interface Props {
  urlParams: IUrlParams;
}

const MemoryUsageChart: React.SFC<Props> = ({ urlParams }) => (
  <MemoryChartDataRequest
    urlParams={urlParams}
    render={({ data }) => (
      <SyncChartGroup
        render={syncProps => (
          <React.Fragment>
            <EuiTitle size="s">
              <span>Memory usage</span>
            </EuiTitle>
            <CustomPlot
              {...syncProps}
              series={data.series}
              tickFormatY={asGB}
              formatTooltipValue={(c: Coordinate) => asGB(c.y)}
            />
          </React.Fragment>
        )}
      />
    )}
  />
);

export { MemoryUsageChart };
