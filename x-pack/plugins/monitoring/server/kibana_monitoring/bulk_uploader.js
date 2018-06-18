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
 *   - monitoring feature from xpack_main.info isAvailable() and isEnabled()
 * The dependencies are handled upstream
 * - Ops Events - essentially Kibana's /api/status
 * - Usage Stats - essentially Kibana's /api/stats
 * - Kibana Settings - select uiSettings
 * @param {Object} server HapiJS server instance
 * @param {CollectorSet} collectorSet a set of collectors to use for the initial fetch and upload
 * @param {Object} xpackInfo server.plugins.xpack_main.info object
 */
export class BulkUploader {
  constructor(server, collectorSet, xpackMainInfo, { interval, combineTypes }) {
    if (typeof interval !== 'number') {
      throw new Error('interval number of milliseconds is required');
    }
    if (typeof combineTypes !== 'function') {
      throw new Error('combineTypes function is required');
    }

    this._timer =  null;
    this._xpackMainInfo = xpackMainInfo;
    this._interval = interval;
    this._combineTypes = combineTypes;
    this._log = getCollectorLogger(server);

    this._client = server.plugins.elasticsearch.getCluster('admin').createClient({
      plugins: [monitoringBulk],
    });

    this._callClusterWithInternalUser = callClusterFactory(server).getCallClusterInternal();

    /*
     * Start the interval
     * Defined as an enclosed function to effectively have no need for a `this.collectorSet`
     */
    this.start = () => {
      if (this._timer) {
        this._log.warn('BulkUploader timer already started');
        return;
      }

      this._log.info('Starting monitoring stats collection');

      this._fetchAndUpload(collectorSet); // initial fetch
      this._timer = setInterval(() => {
        this._fetchAndUpload(collectorSet);
      }, this._interval);
    };
  }

  /*
   * start() and stop() are lifecycle event handlers for
   * xpackMainPlugin state changes
   */
  stop() {
    clearInterval(this._timer);
    this._timer = null;
  }

  /*
   * @param {CollectorSet} collectorSet
   * @return undefined
   */
  async _fetchAndUpload(collectorSet) {
    // Before every fetch, check the license and make sure the bulk endpoint on the ES side is up
    const mainMonitoring = this._xpackMainInfo.feature('monitoring');
    const monitoringBulkEnabled = mainMonitoring && mainMonitoring.isAvailable() && mainMonitoring.isEnabled();

    if (!monitoringBulkEnabled) {
      return; // upload will not work
    }

    const data = await collectorSet.bulkFetch(this._callClusterWithInternalUser);
    const usableData = data.filter(d => Boolean(d) && !isEmpty(d.result));
    const payload = usableData.map(({ result, type }) => {
      if (!isEmpty(result)) {
        return [{ index: { _type: type } }, result];
      }
    });

    if (payload.length > 0) {
      try {
        const combinedData = this._combineTypes(payload); // use the collector types combiner
        this._log.debug(`Uploading bulk stats payload to the local cluster`);
        this._onPayload(flatten(combinedData));
      } catch (err) {
        this._log.warn(err.stack);
        this._log.warn(
          `Unable to bulk upload the stats payload to the local cluster`
        );
      }
    } else {
      this._log.debug(`Skipping bulk uploading of an empty stats payload`);
    }
  }

  _onPayload(payload) {
    return sendBulkPayload(this._client, this._interval, payload);
  }
}
