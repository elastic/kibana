/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KIBANA_STATS_TYPE } from '../../../common/constants';
import { opsBuffer } from './ops_buffer';
import { Collector } from '../classes';

/*
 * Initialize a collector for Kibana Ops Stats
 */
export function getOpsStatsCollector(server) {
  let monitor;
  const buffer = opsBuffer(server);
  const onOps = event => buffer.push(event);
  const init = () => {
    monitor = server.plugins['even-better'].monitor;
    monitor.on('ops', onOps);
  };

  const cleanup = () => {
    if (monitor) {
      monitor.removeListener('ops', onOps);
    }
  };

  // If connection to elasticsearch is lost
  // NOTE it is possible for the plugin status to go from red to red and trigger cleanup twice
  server.plugins.elasticsearch.status.on('red', cleanup);

  // `process` is a NodeJS global, and is always available without using require/import
  process.on('SIGHUP', () => {
    this.log.info('Re-initializing Kibana Monitoring due to SIGHUP');
    setTimeout(() => {
      cleanup();
      init();
      this.log.info('Re-initialized Kibana Monitoring due to SIGHUP');
    }, 5 * 1000); // wait 5 seconds to avoid race condition with reloading logging configuration
  });

  return new Collector(server, {
    type: KIBANA_STATS_TYPE,
    init,
    fetch: buffer.flush
  });
}
