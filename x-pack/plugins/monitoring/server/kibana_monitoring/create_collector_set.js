/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG, } from '../../common/constants';
import { monitoringBulk } from './lib/monitoring_bulk';
import { startCollectorSet } from './start_collector_set';

/**
 * @param kbnServer {Object} manager of Kibana services - see `src/server/kbn_server` in Kibana core
 * @param server {Object} HapiJS server instance
 * @return {Object} CollectorSet instance to be exposed at a higher level, for other plugins to register their own type collectors
 */
export function createCollectorSet(kbnServer, server) {
  const mainXpackInfo = server.plugins.xpack_main.info;
  const mainMonitoring = mainXpackInfo.feature('monitoring');

  let collectorSet;

  if (mainXpackInfo && mainMonitoring.isAvailable() && mainMonitoring.isEnabled()) {
    const client = server.plugins.elasticsearch.getCluster('admin').createClient({
      plugins: [monitoringBulk]
    });
    collectorSet = startCollectorSet(kbnServer, server, client);
  } else {
    server.log(
      ['error', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
      'Unable to retrieve X-Pack info from the admin cluster. Kibana monitoring will be disabled until Kibana is restarted.'
    );
  }

  return collectorSet;
}
