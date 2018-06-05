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
import { monitoringBulk } from './lib/monitoring_bulk';
import { sendBulkPayload } from './lib/send_bulk_payload';
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

  let collectorSet = null;
  if (mainXpackInfo && mainMonitoring.isAvailable() && mainMonitoring.isEnabled()) {
    const config = server.config();
    const interval = config.get('xpack.monitoring.kibana.collection.interval');
    const client = server.plugins.elasticsearch.getCluster('admin').createClient({
      plugins: [monitoringBulk]
    });
    collectorSet = new CollectorSet(server, {
      interval,
      combineTypes: getCollectorTypesCombiner(kbnServer, config),
      onPayload(payload) {
        return sendBulkPayload(client, interval, payload);
      }
    });
  } else {
    server.log(
      ['error', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
      'Unable to retrieve X-Pack info from the admin cluster. Kibana monitoring will be disabled until Kibana is restarted.'
    );
  }

  if (collectorSet) {
    // register collector objects with the usage collection service for stats to show up in the API
    collectorSet.register(getKibanaUsageCollector(server));
    collectorSet.register(getOpsStatsCollector(server));
    collectorSet.register(getSettingsCollector(server));

    // wrap the collectorSet with a bulk uploader for collecting monitoring stats
    const config = server.config();
    const interval = config.get('xpack.monitoring.kibana.collection.interval');

    const bulkUploader = new BulkUploader(server, collectorSet, {
      interval,
      combineTypes: getCollectorTypesCombiner(kbnServer, config),
    });

    return {
      collectorSet,
      bulkUploader
    };
  }
}
