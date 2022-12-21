/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCore } from '../../../../types';
import { logstashNodeRoute } from './node';
import { logstashNodesRoute } from './nodes';
import { logstashOverviewRoute } from './overview';
import { logstashPipelineRoute } from './pipeline';
import { logstashClusterPipelinesRoute } from './pipelines/cluster_pipelines';
import { logstashClusterPipelineIdsRoute } from './pipelines/cluster_pipeline_ids';
import { logstashNodePipelinesRoute } from './pipelines/node_pipelines';

export function registerV1LogstashRoutes(server: MonitoringCore) {
  logstashClusterPipelineIdsRoute(server);
  logstashClusterPipelinesRoute(server);
  logstashNodePipelinesRoute(server);
  logstashNodeRoute(server);
  logstashNodesRoute(server);
  logstashOverviewRoute(server);
  logstashPipelineRoute(server);
}
