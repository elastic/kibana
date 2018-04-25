/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { requireUIRoutes } from './server/routes';
import { instantiateClient } from './server/es_client/instantiate_client';
import { initMonitoringXpackInfo } from './server/init_monitoring_xpack_info';
import { initKibanaMonitoring } from './server/kibana_monitoring';

/**
 * Initialize the Kibana Monitoring plugin by starting up asynchronous server
 * tasks, based on user-defined configuration
 * - webserver route handling
 * - monitoring cluster health checker
 * - instantiation of an elasticsearch-js client exposed as a server plugin object
 * - start kibana ops monitoring loop
 * - start monitoring cluster x-pack license and features check loop
 * @param monitoringPlugin {Object} Monitoring UI plugin
 * @param server {Object} HapiJS server instance
 */
export const init = (monitoringPlugin, server) => {
  const xpackMainPlugin = server.plugins.xpack_main;

  xpackMainPlugin.status.once('green', async () => {
    const config = server.config();
    const uiEnabled = config.get('xpack.monitoring.ui.enabled');
    const features = [];
    const onceMonitoringGreen = callbackFn => monitoringPlugin.status.once('green', () => callbackFn()); // avoid race condition in things that require ES client

    if (uiEnabled) {
      // Instantiate the dedicated ES client
      features.push(instantiateClient(server));

      // route handlers depend on xpackInfo (exposed as server.plugins.monitoring.info)
      onceMonitoringGreen(async () => {
        await initMonitoringXpackInfo(server);
      });

      // Require only routes needed for ui app
      features.push(requireUIRoutes(server));
    }

    // Send Kibana usage / server ops to the monitoring bulk api
    if (config.get('xpack.monitoring.kibana.collection.enabled')) {
      onceMonitoringGreen(() => {
        features.push(initKibanaMonitoring(monitoringPlugin.kbnServer, server));
      });
    }

    Promise.all(features);
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
