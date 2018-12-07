/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore
import { TransactionCharts } from 'x-pack/plugins/apm/public/components/shared/charts/TransactionCharts';
import { TransactionOverviewChartsRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/transactionOverviewCharts';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { MemoryUsageChart } from './MemoryUsageChart';

interface ServiceMetricsProps {
  serviceName: string;
  urlParams: IUrlParams;
}

export const ServiceMetrics: React.SFC<ServiceMetricsProps> = props => {
  const { serviceName, urlParams } = props;
  // TODO: Find out why serviceName isn't present in urlParams here?
  const params = { serviceName, ...urlParams };
  return (
    <React.Fragment>
      <TransactionOverviewChartsRequest
        urlParams={params}
        render={({ data }) => (
          <TransactionCharts
            charts={data}
            urlParams={params}
            location={location}
          />
        )}
      />
      <MemoryUsageChart />
    </React.Fragment>
  );
};
