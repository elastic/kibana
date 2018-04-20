/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callClusterFactory } from '../../../xpack_main';
import { TypeCollector } from './lib/type_collector';
import { getOpsStatsCollector } from './collectors/get_ops_stats_collector';
import { getSettingsCollector } from './collectors/get_settings_collector';
import { getUsageCollector } from './collectors/get_usage_collector';
import { getReportingCollector } from './collectors/get_reporting_collector';
import { sendBulkPayload } from './lib/send_bulk_payload';
import { getCollectorTypesCombiner } from './lib/get_collector_types_combiner';

/**
 * Initialize different types of Kibana Monitoring
 * - Ops Events - essentially Kibana's /api/status
 * - Usage Stats - essentially Kibana's /api/stats
 * - Kibana Settings - select uiSettings
 * @param kbnServer {Object} manager of Kibana services - see `src/server/kbn_server` in Kibana core
 * @param server {Object} HapiJS server instance
 * @param client {Object} Dedicated ES Client with monitoringBulk plugin
 */
export function startCollector(kbnServer, server, client, _sendBulkPayload = sendBulkPayload) {
  const config = server.config();
  const interval = config.get('xpack.monitoring.kibana.collection.interval');

  const collector = new TypeCollector({
    interval,
    logger(...message) {
      server.log(...message);
    },
    combineTypes: getCollectorTypesCombiner(kbnServer, config),
    onPayload(payload) {
      return _sendBulkPayload(client, interval, payload);
    }
  });
  const callCluster = callClusterFactory(server).getCallClusterInternal();

  collector.register(getUsageCollector(server, callCluster));
  collector.register(getOpsStatsCollector(server));
  collector.register(getSettingsCollector(server));
  collector.register(getReportingCollector(server, callCluster));

  // Startup Kibana cleanly or reconnect to Elasticsearch
  server.plugins.elasticsearch.status.on('green', () => {
    collector.start();
  });

  // If connection to elasticsearch is lost
  // NOTE it is possible for the plugin status to go from red to red and trigger cleanup twice
  server.plugins.elasticsearch.status.on('red', () => {
    collector.cleanup();
  });
}
