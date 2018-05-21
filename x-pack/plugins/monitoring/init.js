/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { requireUIRoutes } from './server/routes';
import { instantiateClient } from './server/es_client/instantiate_client';
import { initMonitoringXpackInfo } from './server/init_monitoring_xpack_info';
import { createCollectorSet } from './server/kibana_monitoring';

/**
 * Initialize the Kibana Monitoring plugin by starting up asynchronous server tasks
 * - [1] instantiation of an elasticsearch-js client exposed as a server plugin object
 * - [2] start monitoring cluster x-pack license and features check
 * - [3] webserver route handling
 * - [4] start the internal monitoring collectors
 * - [5] expose the monitoring collector object for other plugins to register with
 * - [6] set monitoring plugin status to green
 * @param monitoringPlugin {Object} Monitoring UI plugin
 * @param server {Object} HapiJS server instance
 */
export const init = (monitoringPlugin, server) => {
  monitoringPlugin.status.yellow('Initializing');
  const xpackMainPlugin = server.plugins.xpack_main;

  xpackMainPlugin.status.once('green', async () => {
    const config = server.config();
    const uiEnabled = config.get('xpack.monitoring.ui.enabled');

    if (uiEnabled) {
      await instantiateClient(server); // Instantiate the dedicated ES client
      await initMonitoringXpackInfo(server); // Route handlers depend on this for xpackInfo
      await requireUIRoutes(server);
    }

    if (config.get('xpack.monitoring.kibana.collection.enabled')) {
      const collectorSet = createCollectorSet(monitoringPlugin.kbnServer, server); // instantiate an object for collecting/sending metrics and usage stats
      server.expose('collectorSet', collectorSet); // expose the collector set object on the server. other plugins will call statsCollectors.register(collector) to define their own collection
    }

    monitoringPlugin.status.green('Ready');
  });

  server.injectUiAppVars('monitoring', (server) => {
    const config = server.config();
    return {
      maxBucketSize: config.get('xpack.monitoring.max_bucket_size'),
      minIntervalSeconds: config.get('xpack.monitoring.min_interval_seconds'),
      kbnIndex: config.get('kibana.index'),
      esApiVersion: config.get('elasticsearch.apiVersion'),
      esShardTimeout: config.get('elasticsearch.shardTimeout'),
      showLicenseExpiration: config.get('xpack.monitoring.show_license_expiration'),
      showCgroupMetricsElasticsearch: config.get('xpack.monitoring.ui.container.elasticsearch.enabled'),
      showCgroupMetricsLogstash: config.get('xpack.monitoring.ui.container.logstash.enabled') // Note, not currently used, but see https://github.com/elastic/x-pack-kibana/issues/1559 part 2
    };
  });
};
