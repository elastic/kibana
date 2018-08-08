/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set, isEmpty, flatten, uniq } from 'lodash';
import { callClusterFactory } from '../../../xpack_main';
import {
  LOGGING_TAG,
  KIBANA_MONITORING_LOGGING_TAG,
  KIBANA_STATS_TYPE_MONITORING,
  KIBANA_SETTINGS_TYPE,
  KIBANA_USAGE_TYPE,
} from '../../common/constants';
import { KIBANA_REPORTING_TYPE } from '../../../reporting/common/constants';
import {
  sendBulkPayload,
  monitoringBulk,
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
  constructor(server, { interval }) {
    if (typeof interval !== 'number') {
      throw new Error('interval number of milliseconds is required');
    }

    this._timer =  null;
    this._interval = interval;
    this._log = {
      debug: message => server.log(['debug', ...LOGGING_TAGS], message),
      info: message => server.log(['info', ...LOGGING_TAGS], message),
      warn: message => server.log(['warning', ...LOGGING_TAGS], message)
    };

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
    const payload = BulkUploader.toBulkUploadFormat(data);

    if (payload) {
      try {
        this._log.debug(`Uploading bulk stats payload to the local cluster`);
        this._onPayload(payload);
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

  /*
   * Bulk stats are transformed into a bulk upload format
   * Non-legacy transformation is done in CollectorSet.toApiStats
   */
  static toBulkUploadFormat(uploadData) {
    const payload = uploadData
      .filter(d => Boolean(d) && !isEmpty(d.result))
      .map(({ result, type }) => [{ index: { _type: type } }, result]);
    if (payload.length > 0) {
      const combinedData = BulkUploader.combineStatsLegacy(payload); // arrange the usage data into the stats
      return flatten(combinedData);
    }
  }

  static checkPayloadTypesUnique(payload) {
    const ids = payload.map(item => item[0].index._type);
    const uniques = uniq(ids);
    if (ids.length !== uniques.length) {
      throw new Error('Duplicate collector type identifiers found in payload! ' + ids.join(','));
    }
  }

  static combineStatsLegacy(payload) {
    BulkUploader.checkPayloadTypesUnique(payload);

    // default the item to [] to allow destructuring
    const findItem = type => payload.find(item => get(item, '[0].index._type') === type) || [];

    // kibana usage and stats
    let statsResult;
    const [ statsHeader, statsPayload ] = findItem(KIBANA_STATS_TYPE_MONITORING);
    const [ reportingHeader, reportingPayload ] = findItem(KIBANA_REPORTING_TYPE);

    if (statsHeader && statsPayload) {
      statsHeader.index._type = 'kibana_stats'; // HACK to convert kibana_stats_monitoring to just kibana_stats for bwc
      const [ usageHeader, usagePayload ] = findItem(KIBANA_USAGE_TYPE);
      const kibanaUsage = (usageHeader && usagePayload) ? usagePayload : null;
      const reportingUsage = (reportingHeader && reportingPayload) ? reportingPayload : null;
      statsResult = [ statsHeader, statsPayload ];
      if (kibanaUsage) {
        set(statsResult, '[1].usage', kibanaUsage);
      }
      if (reportingUsage) {
        set(statsResult, '[1].usage.xpack.reporting', reportingUsage);
      }
    }

    // kibana settings
    let settingsResult;
    const [ settingsHeader, settingsPayload ] = findItem(KIBANA_SETTINGS_TYPE);
    if (settingsHeader && settingsPayload) {
      settingsResult = [ settingsHeader, settingsPayload ];
    }

    // return new payload with the combined data
    // adds usage data to stats data
    // strips usage out as a top-level type
    const result = [ statsResult, settingsResult ];

    // remove result items that are undefined
    return result.filter(Boolean);
  }
}
