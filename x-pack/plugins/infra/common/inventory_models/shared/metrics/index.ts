/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { nginxRequestRate } from './tsvb/nginx_request_rate';
import { nginxActiveConnections } from './tsvb/nginx_active_connections';
import { nginxHits } from './tsvb/nginx_hits';
import { nginxRequestsPerConnection } from './tsvb/nginx_requests_per_connection';

import { awsCpuUtilization } from './tsvb/aws_cpu_utilization';
import { awsDiskioBytes } from './tsvb/aws_diskio_bytes';
import { awsDiskioOps } from './tsvb/aws_diskio_ops';
import { awsNetworkBytes } from './tsvb/aws_network_bytes';
import { awsNetworkPackets } from './tsvb/aws_network_packets';
import { awsOverview } from './tsvb/aws_overview';
import { InventoryMetrics } from '../../types';
import { count } from './snapshot/count';

export const metrics: InventoryMetrics = {
  tsvb: {
    nginxActiveConnections,
    nginxHits,
    nginxRequestRate,
    nginxRequestsPerConnection,
    awsCpuUtilization,
    awsDiskioBytes,
    awsDiskioOps,
    awsNetworkBytes,
    awsNetworkPackets,
    awsOverview,
  },
  snapshot: {
    count,
  },
  defaultSnapshot: 'count',
  defaultTimeRangeInSeconds: 3600,
};
