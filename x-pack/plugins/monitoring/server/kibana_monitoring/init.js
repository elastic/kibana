/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BulkUploader } from './bulk_uploader';

/**
 * Initialize different types of Kibana Monitoring
 * TODO: remove this in 7.0
 * - Ops Events - essentially Kibana's /api/status
 * - Usage Stats - essentially Kibana's /api/stats
 * - Kibana Settings - select uiSettings
 * @param {Object} kbnServer manager of Kibana services - see `src/server/kbn_server` in Kibana core
 * @param {Object} server HapiJS server instance
 */
export function initBulkUploader(_kbnServer, server) {
  const config = server.config();
  const interval = config.get('xpack.monitoring.kibana.collection.interval');

  return new BulkUploader(server, {
    interval
  });
}
