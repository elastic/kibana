/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface MonitoringUsage {
  hasMonitoringData: boolean;
  clusters: MonitoringClusterStackProductUsage[];
}

export interface MonitoringClusterStackProductUsage {
  clusterUuid: string;
  license: string;
  metricbeatUsed: boolean;
  elasticsearch: StackProductUsage;
  logstash: StackProductUsage;
  kibana: StackProductUsage;
  beats: StackProductUsage;
  apm: StackProductUsage;
}

export interface StackProductUsage {
  count: number;
  enabled: boolean;
  metricbeatUsed: boolean;
}
