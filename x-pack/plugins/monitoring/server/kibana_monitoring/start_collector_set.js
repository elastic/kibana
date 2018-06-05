/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CollectorSet } from './classes/collector_set';
import { getOpsStatsCollector } from './collectors/get_ops_stats_collector';
import { getSettingsCollector } from './collectors/get_settings_collector';
import { getKibanaUsageCollector } from './collectors/get_kibana_usage_collector';
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
 * @return {Object} CollectorSet instance
 */
export function startCollectorSet(kbnServer, server, client, _sendBulkPayload = sendBulkPayload) {
  const config = server.config();
  const interval = config.get('xpack.monitoring.kibana.collection.interval');

  const collectorSet = new CollectorSet(server, {
    interval,
    combineTypes: getCollectorTypesCombiner(kbnServer, config),
    onPayload(payload) {
      return _sendBulkPayload(client, interval, payload);
    }
  });

  collectorSet.register(getKibanaUsageCollector(server));
  collectorSet.register(getOpsStatsCollector(server));
  collectorSet.register(getSettingsCollector(server));

  // Startup Kibana cleanly or reconnect to Elasticsearch
  server.plugins.elasticsearch.status.on('green', () => {
    collectorSet.start();
  });

  // If connection to elasticsearch is lost
  // NOTE it is possible for the plugin status to go from red to red and trigger cleanup twice
  server.plugins.elasticsearch.status.on('red', () => {
    collectorSet.cleanup();
  });

  return collectorSet;
}
