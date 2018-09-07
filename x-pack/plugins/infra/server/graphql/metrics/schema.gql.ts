/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const metricsSchema: any = gql`
  enum InfraMetric {
    hostCpuUsage
    hostFilesystem
    hostK8sCpuCapGauge
    hostK8sCpuCap
    hostK8sDiskCapGauge
    hostK8sDiskCap
    hostK8sMemoryCap
    hostK8sMemoryCapGauge
    hostK8sPodCap
    hostK8sPodCapGauge
    hostLoad
    hostMemoryUsage
    hostNetworkTraffic
    hostCpuUsageGauge
    hostLoadGauge
    hostMemoryGauge
    hostNetworkInGauge
    hostNetworkOutGauge
    podCpuUsage
    podDiskUsage
    podLogUsage
    podNetworkTraffic
    podMemoryGauge
    podNetInGauge
    podNetOutGauge
    containerCpuKernel
    containerCpuUsage
    containerDiskIOReadsOps
    containerDiskIOOps
    containerDiskIOBytes
    containerHealth
    containerMemory
    containerNetworkTraffic
  }

  type InfraMetricData {
    id: InfraMetric
    series: [InfraDataSeries!]!
  }

  type InfraDataSeries {
    id: ID!
    data: [InfraDataPoint!]!
  }

  type InfraDataPoint {
    timestamp: Float
    value: Float
  }

  extend type InfraSource {
    metrics(
      id: ID!
      type: InfraNodeType!
      timerange: InfraTimerangeInput!
      metrics: [InfraMetric!]!
    ): [InfraMetricData!]!
  }
`;
