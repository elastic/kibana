/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LOGGING_TAG,
  KIBANA_MONITORING_LOGGING_TAG,
  KIBANA_STATS_TYPE_MONITORING,
} from '../../../common/constants';
import { opsBuffer } from './ops_buffer';

/*
 * Initialize a collector for Kibana Ops Stats
 */
export function getOpsStatsCollector(server) {
  let monitor;
  const buffer = opsBuffer(server);
  const onOps = event => buffer.push(event);

  const start = () => {
    monitor = server.plugins['even-better'].monitor;
    monitor.on('ops', onOps);
  };
  const stop = () => {
    if (monitor) {
      monitor.removeListener('ops', onOps);
    }
  };

  /* Handle stopping / restarting the event listener if Elasticsearch stops and restarts
   * NOTE it is possible for the plugin status to go from red to red and
   * trigger handlers twice
   */
  server.plugins.elasticsearch.status.on('red', stop);
  server.plugins.elasticsearch.status.on('green', start);

  // `process` is a NodeJS global, and is always available without using require/import
  process.on('SIGHUP', () => {
    server.log(
      ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
      'Re-initializing Kibana Monitoring due to SIGHUP'
    );
    setTimeout(() => {
      stop();
      start();
      server.log(
        ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
        'Re-initialized Kibana Monitoring due to SIGHUP'
      );
    }, 5 * 1000); // wait 5 seconds to avoid race condition with reloading logging configuration
  });

  const { collectorSet } = server.usage;
  return collectorSet.makeStatsCollector({
    type: KIBANA_STATS_TYPE_MONITORING,
    init: start,
    fetch: async () => {
      return await buffer.flush();
    }
  });
}
