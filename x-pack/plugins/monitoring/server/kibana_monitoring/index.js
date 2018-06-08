/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG, } from '../../common/constants';
import { CollectorSet } from './classes';
import {
  getKibanaUsageCollector,
  getOpsStatsCollector,
  getSettingsCollector,
} from './collectors';
import { BulkUploader } from './bulk_uploader';
import { getCollectorTypesCombiner } from './lib';

/**
 * Initialize different types of Kibana Monitoring
 * TODO: remove this in 7.0
 * - Ops Events - essentially Kibana's /api/status
 * - Usage Stats - essentially Kibana's /api/stats
 * - Kibana Settings - select uiSettings
 * @param kbnServer {Object} manager of Kibana services - see `src/server/kbn_server` in Kibana core
 * @param server {Object} HapiJS server instance
 */
export function initKibanaMonitoring(kbnServer, server) {
  const mainXpackInfo = server.plugins.xpack_main.info;
  const mainMonitoring = mainXpackInfo.feature('monitoring');

  const collectorSet = new CollectorSet(server);
  // register collector objects with the usage collection service for stats to show up in the API
  collectorSet.register(getKibanaUsageCollector(server));
  collectorSet.register(getOpsStatsCollector(server));
  collectorSet.register(getSettingsCollector(server));

  let bulkUploader;
  if (mainXpackInfo && mainMonitoring.isAvailable() && mainMonitoring.isEnabled()) {
    // wrap the collectorSet with a bulk uploader for collecting monitoring stats
    const config = server.config();
    const interval = config.get('xpack.monitoring.kibana.collection.interval');
    bulkUploader = new BulkUploader(server, collectorSet, {
      interval,
      combineTypes: getCollectorTypesCombiner(kbnServer, config)
    });
  } else {
    server.log(
      ['error', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
      'Unable to retrieve X-Pack info from the admin cluster. Kibana monitoring will be disabled until Kibana is restarted.'
    );
  }

  return {
    collectorSet,
    bulkUploader
  };
}
