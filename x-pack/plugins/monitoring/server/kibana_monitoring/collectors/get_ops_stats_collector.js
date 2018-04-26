/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KIBANA_STATS_TYPE } from '../../../common/constants';
import { opsBuffer } from './ops_buffer';

/*
 * Initialize a collector for Kibana Ops Stats
 * FIXME: https://github.com/elastic/x-pack-kibana/issues/1301
 */
export function getOpsStatsCollector(server) {
  let monitor;
  const buffer = opsBuffer(server);
  const onOps = event => buffer.push(event);
  const init = () => {
    monitor = server.plugins['even-better'].monitor;
    monitor.on('ops', onOps);
  };

  let _log;
  const setLogger = logger => {
    _log = logger;
  };

  const cleanup = () => {
    if (monitor) {
      monitor.removeListener('ops', onOps);
    }
  };

  // This needs to be removed once the FIXME for 1301 is fixed
  // `process` is a NodeJS global, and is always available without using require/import
  process.on('SIGHUP', () => {
    _log.info('Re-initializing Kibana Monitoring due to SIGHUP');
    /* This timeout is a temporary stop-gap until collecting stats is not bound to even-better
     * and collecting stats is not interfered by logging configuration reloading
     * Related to https://github.com/elastic/x-pack-kibana/issues/1301
     */
    setTimeout(() => {
      cleanup();
      init();
      _log.info('Re-initialized Kibana Monitoring due to SIGHUP');
    }, 5 * 1000); // wait 5 seconds to avoid race condition with reloading logging configuration
  });

  return {
    type: KIBANA_STATS_TYPE,
    init,
    setLogger,
    fetch: buffer.flush,
    fetchAfterInit: true,
    cleanup
  };
}
