/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, flatten } from 'lodash';
import { callClusterFactory } from '../../../xpack_main';
import {
  getCollectorLogger,
  sendBulkPayload,
  monitoringBulk,
} from './lib';

/*
 * Handles internal Kibana stats collection and uploading data to Monitoring
 * bulk endpoint.
 *
 * NOTE: internal collection will be removed in 7.0
 *
 * Depends on
 *   - 'xpack.monitoring.kibana.collection.enabled' config
 *   - monitoring enabled in ES (checked against xpack_main.info license info change)
 * The dependencies are handled upstream
 * - Ops Events - essentially Kibana's /api/status
 * - Usage Stats - essentially Kibana's /api/stats
 * - Kibana Settings - select uiSettings
 * @param {Object} server HapiJS server instance
 * @param {Object} xpackInfo server.plugins.xpack_main.info object
 */
export class BulkUploader {
  constructor(server, { interval, combineTypes }) {
    if (typeof interval !== 'number') {
      throw new Error('interval number of milliseconds is required');
    }
    if (typeof combineTypes !== 'function') {
      throw new Error('combineTypes function is required');
    }

    this._timer =  null;
    this._interval = interval;
    this._combineTypes = combineTypes;
    this._log = getCollectorLogger(server);

    this._client = server.plugins.elasticsearch.getCluster('admin').createClient({
      plugins: [monitoringBulk],
    });

    this._callClusterWithInternalUser = callClusterFactory(server).getCallClusterInternal();

  }

  /*
   * Start the interval timer
   * @param {CollectorSet} collectorSet object to use for initial the fetch/upload and fetch/uploading on interval
   * @return undefined
   */
  start(collectorSet) {
    this._log.info('Starting monitoring stats collection');
    this._fetchAndUpload(collectorSet); // initial fetch
    this._timer = setInterval(() => {
      this._fetchAndUpload(collectorSet);
    }, this._interval);
  }

  /*
   * start() and stop() are lifecycle event handlers for
   * xpackMainPlugin license changes
   * @param {String} logPrefix help give context to the reason for stopping
   */
  stop(logPrefix) {
    clearInterval(this._timer);
    this._timer = null;

    const prefix = logPrefix ? logPrefix + ':' : '';
    this._log.info(prefix + 'Monitoring stats collection is stopped');
  }

  handleNotEnabled() {
    this.stop('Monitoring status upload endpoint is not enabled in Elasticsearch');
  }
  handleConnectionLost() {
    this.stop('Connection issue detected');
  }

  /*
   * @param {CollectorSet} collectorSet
   * @return {Promise} - resolves to undefined
   */
  async _fetchAndUpload(collectorSet) {
    const data = await collectorSet.bulkFetch(this._callClusterWithInternalUser);
    const payload = data
      .filter(d => Boolean(d) && !isEmpty(d.result))
      .map(({ result, type }) => [{ index: { _type: type } }, result]);

    if (payload.length > 0) {
      try {
        const combinedData = this._combineTypes(payload); // use the collector types combiner
        this._log.debug(`Uploading bulk stats payload to the local cluster`);
        this._onPayload(flatten(combinedData));
      } catch (err) {
        this._log.warn(err.stack);
        this._log.warn(`Unable to bulk upload the stats payload to the local cluster`);
      }
    } else {
      this._log.debug(`Skipping bulk uploading of an empty stats payload`);
    }
  }

  _onPayload(payload) {
    return sendBulkPayload(this._client, this._interval, payload);
  }
}
