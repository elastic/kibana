/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCore } from '../../../../types';
import { ccrRoute } from './ccr';
import { ccrShardRoute } from './ccr_shard';
import { esIndexRoute } from './index_detail';
import { esIndicesRoute } from './indices';
import { mlJobRoute } from './ml_jobs';
import { esNodesRoute } from './nodes';
import { esNodeRoute } from './node_detail';
import { esOverviewRoute } from './overview';

export function registerV1ElasticsearchRoutes(server: MonitoringCore) {
  esIndexRoute(server);
  esIndicesRoute(server);
  esNodeRoute(server);
  esNodesRoute(server);
  esOverviewRoute(server);
  mlJobRoute(server);
  ccrRoute(server);
  ccrShardRoute(server);
}
