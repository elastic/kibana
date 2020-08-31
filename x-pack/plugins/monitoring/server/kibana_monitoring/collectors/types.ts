/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface MonitoringUsage {
  isEnabled: boolean;
  clusters: MonitoringClusterUsage[];
}

export interface MonitoringClusterUsage {
  clusterUuid: string;
  license: string;
  elasticsearch: StackProductUsage;
  logstash: StackProductUsage;
  kibana: StackProductUsage;
  beats: StackProductUsage;
  apm: StackProductUsage;
  stackProductCount: number;
  stackProductMbCount: number;
  stackProductMbRatio: number;
}

export interface StackProductUsage {
  count: number;
  versions: string[];
  mbCount: number;
  mbPercentage: number;
}
