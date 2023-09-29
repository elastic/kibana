/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nginxRequestRate } from './tsvb/nginx_request_rate';
import { nginxActiveConnections } from './tsvb/nginx_active_connections';
import { nginxHits } from './tsvb/nginx_hits';
import { nginxRequestsPerConnection } from './tsvb/nginx_requests_per_connection';

import { InventoryMetrics } from '../../types';
import { count } from './snapshot/count';

export const metrics: InventoryMetrics = {
  tsvb: {
    nginxActiveConnections,
    nginxHits,
    nginxRequestRate,
    nginxRequestsPerConnection,
  },
  snapshot: {
    count,
  },
  defaultSnapshot: 'count',
  defaultTimeRangeInSeconds: 3600,
};
