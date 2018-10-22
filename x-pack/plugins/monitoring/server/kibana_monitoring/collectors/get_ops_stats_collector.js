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
import Oppsy from 'oppsy';
import { cloneDeep } from 'lodash';


class OpsMonitor {
  constructor(server, buffer, interval) {
    this._buffer = buffer;
    this._interval = interval;
    this._oppsy = new Oppsy(server);
    this._server = server;
  }

  start = () => {
    this._oppsy.on('ops', (event) => {
      // Oppsy has a bad race condition that will modify this data before
      // we ship it off to the buffer. Let's create our copy first.
      event = cloneDeep(event);
      // Oppsy used to provide this, but doesn't anymore. Grab it ourselves.
      this._server.listener.getConnections((_, count) => {
        event.concurrent_connections = count;
        this._buffer.push(event);
      });
    });

    this._oppsy.on('error', console.log);
    this._oppsy.start(this._interval);
  };

  stop = () => {
    this._oppsy.stop();
    this._oppsy.removeAllListeners();
  };
}


/*
 * Initialize a collector for Kibana Ops Stats
 */
export function getOpsStatsCollector(server, kbnServer) {
  const buffer = opsBuffer(server);
  const interval = kbnServer.config.get('ops.interval');
  const opsMonitor = new OpsMonitor(server, buffer, interval);

  /* Handle stopping / restarting the event listener if Elasticsearch stops and restarts
   * NOTE it is possible for the plugin status to go from red to red and
   * trigger handlers twice
   */
  server.plugins.elasticsearch.status.on('red', opsMonitor.stop);
  server.plugins.elasticsearch.status.on('green', opsMonitor.start);

  // `process` is a NodeJS global, and is always available without using require/import
  process.on('SIGHUP', () => {
    server.log(
      ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
      'Re-initializing Kibana Monitoring due to SIGHUP'
    );
    setTimeout(() => {
      opsMonitor.stop();
      opsMonitor.start();
      server.log(
        ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
        'Re-initializing Kibana Monitoring due to SIGHUP'
      );
    }, 5 * 1000); // wait 5 seconds to avoid race condition with reloading logging configuration
  });

  const { collectorSet } = server.usage;
  return collectorSet.makeStatsCollector({
    type: KIBANA_STATS_TYPE_MONITORING,
    init: opsMonitor.start,
    fetch: async () => {
      return await buffer.flush();
    }
  });
}
