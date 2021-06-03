/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO:@pjhampton - these need better naming
interface EndpointCpuUsage {
  mean: number;
  histogram: Array<{
    window: number;
    value: number;
  }>;
}

interface EndpointMemoryUsage {
  mean: number;
  latest: number;
}

interface EndpointUsage {
  id: string;
  version: string;
  os_name: string;
  os_version: string;
  uptime_endpoint: number;
  uptime_system: number;
  memory: EndpointMemoryUsage;
  cpu: EndpointCpuUsage;
}

export interface EndpointMetrics {
  endpoints_total: number;
  endpoints: EndpointUsage[];
}
