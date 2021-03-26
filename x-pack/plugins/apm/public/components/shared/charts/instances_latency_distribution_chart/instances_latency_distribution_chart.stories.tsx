/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import {
  InstancesLatencyDistributionChart,
  InstancesLatencyDistributionChartProps,
} from './';

export default {
  title: 'shared/charts/InstancesLatencyDistributionChart',
  component: InstancesLatencyDistributionChart,
  argTypes: {
    items: {
      control: { type: 'object' },
    },
  },
  decorators: [
    (Story: ComponentType) => (
      <EuiThemeProvider>
        <Story />
      </EuiThemeProvider>
    ),
  ],
};

export function Example({ items }: InstancesLatencyDistributionChartProps) {
  return (
    <InstancesLatencyDistributionChart
      height={300}
      items={items}
      status={FETCH_STATUS.SUCCESS}
    />
  );
}
Example.args = {
  items: [
    {
      serviceNodeName:
        '2f3221afa3f00d3bc07069d69efd5bd4c1607be6155a204551c8fe2e2b5dd750',
      latency: 1130156.5424836602,
      throughput: 9.71285705065604,
    },
    {
      serviceNodeName:
        '2f3221afa3f00d3bc07069d69efd5bd4c1607be6155a204551c8fe2e2b5dd750 (2)',
      latency: 1130156.5424836602,
      throughput: 9.71285705065604,
    },
    {
      serviceNodeName:
        '3b50ad269c45be69088905c4b355cc75ab94aaac1b35432bb752050438f4216f',
      latency: 10975.761538461538,
      throughput: 8.252754356766571,
    },
  ],
} as InstancesLatencyDistributionChartProps;
