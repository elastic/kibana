/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultsDeep, uniq, compact } from 'lodash';
import { callClusterFactory } from '../../../xpack_main';

import {
  LOGGING_TAG,
  KIBANA_MONITORING_LOGGING_TAG,
} from '../../common/constants';
import {
  sendBulkPayload,
  monitoringBulk,
  getKibanaInfoForStats,
} from './lib';

const LOGGING_TAGS = [LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG];

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
  constructor(server, { kbnServer, interval }) {
    if (typeof interval !== 'number') {
      throw new Error('interval number of milliseconds is required');
    }

    this._timer = null;
    this._interval = interval;
    this._lastFetchUsageTime = null;
    this._usageInterval = server.plugins.xpack_main.telemetryCollectionInterval;

    this._log = {
      debug: message => server.log(['debug', ...LOGGING_TAGS], message),
      info: message => server.log(['info', ...LOGGING_TAGS], message),
      warn: message => server.log(['warning', ...LOGGING_TAGS], message)
    };

    this._cluster = server.plugins.elasticsearch.createCluster('admin', {
      plugins: [monitoringBulk],
    });

    this._callClusterWithInternalUser = callClusterFactory(server).getCallClusterInternal();
    this._getKibanaInfoForStats = () => getKibanaInfoForStats(server, kbnServer);
  }

  /*
   * Start the interval timer
   * @param {CollectorSet} collectorSet object to use for initial the fetch/upload and fetch/uploading on interval
   * @return undefined
   */
  start(collectorSet) {
    this._log.info('Starting monitoring stats collection');
    const filterCollectorSet = _collectorSet => {
      const filterUsage = this._lastFetchUsageTime && this._lastFetchUsageTime + this._usageInterval > Date.now();
      this._lastFetchWithUsage = !filterUsage;
      if (!filterUsage) {
        this._lastFetchUsageTime = Date.now();
      }

      return _collectorSet.getFilteredCollectorSet(c => {
        // this is internal bulk upload, so filter out API-only collectors
        if (c.ignoreForInternalUploader) {
          return false;
        }
        // Only collect usage data at the same interval as telemetry would (default to once a day)
        if (filterUsage && _collectorSet.isUsageCollector(c)) {
          return false;
        }
        return true;
      });
    };

    if (this._timer) {
      clearInterval(this._timer);
    } else {
      this._fetchAndUpload(filterCollectorSet(collectorSet)); // initial fetch
    }

    this._timer = setInterval(() => {
      this._fetchAndUpload(filterCollectorSet(collectorSet));
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
    const payload = this.toBulkUploadFormat(compact(data), collectorSet);

    if (payload) {
      try {
        this._log.debug(`Uploading bulk stats payload to the local cluster`);
        await this._onPayload(payload);
        this._log.debug(`Uploaded bulk stats payload to the local cluster`);
      } catch (err) {
        this._log.warn(err.stack);
        this._log.warn(`Unable to bulk upload the stats payload to the local cluster`);
      }
    } else {
      this._log.debug(`Skipping bulk uploading of an empty stats payload`);
    }
  }

  _onPayload(payload) {
    return sendBulkPayload(this._cluster, this._interval, payload);
  }

  /*
   * Bulk stats are transformed into a bulk upload format
   * Non-legacy transformation is done in CollectorSet.toApiStats
   *
   * Example:
   * Before:
   *    [
   *      {
   *        "type": "kibana_stats",
   *        "result": {
   *          "process": { ...  },
   *          "requests": { ...  },
   *          ...
   *        }
   *      },
   *    ]
   *
   * After:
   *    [
   *      {
   *        "index": {
   *          "_type": "kibana_stats"
   *        }
   *      },
   *      {
   *        "kibana": {
   *          "host": "localhost",
   *          "uuid": "d619c5d1-4315-4f35-b69d-a3ac805489fb",
   *          "version": "7.0.0-alpha1",
   *          ...
   *        },
   *        "process": { ...  },
   *        "requests": { ...  },
   *        ...
   *      }
   *    ]
   */
  toBulkUploadFormat(rawData, collectorSet) {
    if (rawData.length === 0) {
      return;
    }

    // convert the raw data to a nested object by taking each payload through
    // its formatter, organizing it per-type
    const typesNested = rawData.reduce((accum, { type, result }) => {
      const { type: uploadType, payload: uploadData } = collectorSet.getCollectorByType(type).formatForBulkUpload(result);
      return defaultsDeep(accum, { [uploadType]: uploadData });
    }, {});
    // convert the nested object into a flat array, with each payload prefixed
    // with an 'index' instruction, for bulk upload
    const flat = Object.keys(typesNested).reduce((accum, type) => {
      return [
        ...accum,
        { index: { _type: type } },
        {
          kibana: this._getKibanaInfoForStats(),
          ...typesNested[type],
        }
      ];
    }, []);

    return flat;
  }

  static checkPayloadTypesUnique(payload) {
    const ids = payload.map(item => item[0].index._type);
    const uniques = uniq(ids);
    if (ids.length !== uniques.length) {
      throw new Error('Duplicate collector type identifiers found in payload! ' + ids.join(','));
    }
  }
}
