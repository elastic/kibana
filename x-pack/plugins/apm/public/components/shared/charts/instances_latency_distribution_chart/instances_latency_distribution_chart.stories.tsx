/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import {
  InstancesLatencyDistributionChart,
  InstancesLatencyDistributionChartProps,
} from '.';

export default {
  title: 'shared/charts/InstancesLatencyDistributionChart',
  component: InstancesLatencyDistributionChart,
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
        '3f67bfc39c7891dc0c5657befb17bf58c19cf10f99472cf8df263c8e5bb1c766',
      latency: 15802930.92133213,
      throughput: 0.4019360641691481,
    },
    {
      serviceNodeName:
        'd52c64bea9327f3e960ac1cb63c1b7ea922e3cb3d76ab9b254e57a7cb2f760a0',
      latency: 8296442.578550679,
      throughput: 0.3932978392703585,
    },
    {
      serviceNodeName:
        '797e0a906ad342223468ca51b663e1af8bdeb40bab376c46c7f7fa2021349290',
      latency: 34842576.51204916,
      throughput: 0.3353931699532713,
    },
    {
      serviceNodeName:
        '21e1c648bd73434a8a1bf6e849817930e8b43eacf73a5c39c30520ee3b79d8c0',
      latency: 40713854.354498595,
      throughput: 0.32947224189485164,
    },
    {
      serviceNodeName:
        'a1c99c8675372af4c74bb01cc48e75989faa6f010a4ccb027df1c410dde0c72c',
      latency: 18565471.348388012,
      throughput: 0.3261219384041683,
    },
    {
      serviceNodeName: '_service_node_name_missing_',
      latency: 20065471.348388012,
      throughput: 0.3261219384041683,
    },
  ],
} as InstancesLatencyDistributionChartProps;

export function SimilarThroughputInstances({
  items,
}: InstancesLatencyDistributionChartProps) {
  return (
    <InstancesLatencyDistributionChart
      height={300}
      items={items}
      status={FETCH_STATUS.SUCCESS}
    />
  );
}
SimilarThroughputInstances.args = {
  items: [
    {
      serviceNodeName:
        '21e1c648bd73434a8a1bf6e849817930e8b43eacf73a5c39c30520ee3b79d8c0',
      latency: 40713854.354498595,
      throughput: 0.3261219384041683,
    },
    {
      serviceNodeName:
        'a1c99c8675372af4c74bb01cc48e75989faa6f010a4ccb027df1c410dde0c72c',
      latency: 18565471.348388012,
      throughput: 0.3261219384041683,
    },
    {
      serviceNodeName: '_service_node_name_missing_',
      latency: 20065471.348388012,
      throughput: 0.3261219384041683,
    },
  ],
} as InstancesLatencyDistributionChartProps;
