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
 * TODO: remove this in 7.0
 * - Ops Events - essentially Kibana's /api/status
 * - Usage Stats - essentially Kibana's /api/stats
 * - Kibana Settings - select uiSettings
 * @param kbnServer {Object} manager of Kibana services - see `src/server/kbn_server` in Kibana core
 * @param server {Object} HapiJS server instance
 */
export class BulkUploader {
  constructor(server, collectorSet, { interval, combineTypes }) {
    this._timer = null;

    if (typeof interval !== 'number') {
      throw new Error('interval number of milliseconds is required');
    }
    if (typeof combineTypes !== 'function') {
      throw new Error('combineTypes function is required');
    }

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
        throw new Error('BulkUploader timer already started');
      }

      this._log.info(`Starting monitoring stats collection`);

      this._timer = setInterval(() => {
        this._fetchAndUpload(collectorSet);
      }, this._interval);
    };
  }

  async _fetchAndUpload(collectorSet) {
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
