/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, ElasticsearchClientConfig, ICustomClusterClient } from 'kibana/server';
// @ts-ignore
import { monitoringBulk } from '../kibana_monitoring/lib/monitoring_bulk';
import { MonitoringElasticsearchConfig } from '../types';

/* Provide a dedicated Elasticsearch client for Monitoring
 * The connection options can be customized for the Monitoring application
 * This allows the app to connect to a dedicated monitoring cluster even if
 * Kibana itself is connected to a production cluster.
 */

export function instantiateClient(
  elasticsearchConfig: any,
  log: Logger,
  createClient: (
    type: string,
    clientConfig?: Partial<ElasticsearchClientConfig>
  ) => ICustomClusterClient
) {
  const isMonitoringCluster = hasMonitoringCluster(elasticsearchConfig);
  const cluster = createClient('monitoring', {
    ...(isMonitoringCluster ? elasticsearchConfig : {}),
    plugins: [monitoringBulk],
    logQueries: Boolean(elasticsearchConfig.logQueries),
  });

  const configSource = isMonitoringCluster ? 'monitoring' : 'production';
  log.info(`config sourced from: ${configSource} cluster`);
  return cluster;
}

export function hasMonitoringCluster(config: MonitoringElasticsearchConfig) {
  return Boolean(config.hosts && config.hosts[0]);
}
