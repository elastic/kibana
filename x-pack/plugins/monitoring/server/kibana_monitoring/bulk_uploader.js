/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultsDeep, uniq, compact, get } from 'lodash';

import {
  TELEMETRY_COLLECTION_INTERVAL,
  KIBANA_STATS_TYPE_MONITORING,
} from '../../common/constants';

import { sendBulkPayload, monitoringBulk } from './lib';
import { hasMonitoringCluster } from '../es_client/instantiate_client';

/*
 * Handles internal Kibana stats collection and uploading data to Monitoring
 * bulk endpoint.
 *
 * NOTE: internal collection will be removed in 7.0
 *
 * Depends on
 *   - 'monitoring.kibana.collection.enabled' config
 *   - monitoring enabled in ES (checked against xpack_main.info license info change)
 * The dependencies are handled upstream
 * - Ops Events - essentially Kibana's /api/status
 * - Usage Stats - essentially Kibana's /api/stats
 * - Kibana Settings - select uiSettings
 * @param {Object} server HapiJS server instance
 * @param {Object} xpackInfo server.plugins.xpack_main.info object
 */
export class BulkUploader {
  constructor({ config, log, interval, elasticsearch, kibanaStats }) {
    if (typeof interval !== 'number') {
      throw new Error('interval number of milliseconds is required');
    }

    this._hasDirectConnectionToMonitoringCluster = false;
    this._productionClusterUuid = null;
    this._timer = null;
    // Hold sending and fetching usage until monitoring.bulk is successful. This means that we
    // send usage data on the second tick. But would save a lot of bandwidth fetching usage on
    // every tick when ES is failing or monitoring is disabled.
    this._holdSendingUsage = false;
    this._interval = interval;
    this._lastFetchUsageTime = null;
    // Limit sending and fetching usage to once per day once usage is successfully stored
    // into the monitoring indices.
    this._usageInterval = TELEMETRY_COLLECTION_INTERVAL;
    this._log = log;

    this._cluster = elasticsearch.legacy.createClient('admin', {
      plugins: [monitoringBulk],
    });

    if (hasMonitoringCluster(config.elasticsearch)) {
      this._log.info(`Detected direct connection to monitoring cluster`);
      this._hasDirectConnectionToMonitoringCluster = true;
      this._cluster = elasticsearch.legacy.createClient('monitoring-direct', config.elasticsearch);
      elasticsearch.legacy.client.callAsInternalUser('info').then((data) => {
        this._productionClusterUuid = get(data, 'cluster_uuid');
      });
    }

    this.kibanaStats = kibanaStats;
    this.kibanaStatusGetter = null;
  }

  setKibanaStatusGetter(getter) {
    this.kibanaStatusGetter = getter;
  }

  filterCollectorSet(usageCollection) {
    const successfulUploadInLastDay =
      this._lastFetchUsageTime && this._lastFetchUsageTime + this._usageInterval > Date.now();

    return usageCollection.getFilteredCollectorSet((c) => {
      // this is internal bulk upload, so filter out API-only collectors
      if (c.ignoreForInternalUploader) {
        return false;
      }
      // Only collect usage data at the same interval as telemetry would (default to once a day)
      if (usageCollection.isUsageCollector(c)) {
        if (this._holdSendingUsage) {
          return false;
        }
        if (successfulUploadInLastDay) {
          return false;
        }
      }

      return true;
    });
  }

  /*
   * Start the interval timer
   * @param {usageCollection} usageCollection object to use for initial the fetch/upload and fetch/uploading on interval
   * @return undefined
   */
  start(usageCollection) {
    this._log.info('Starting monitoring stats collection');

    if (this._timer) {
      clearInterval(this._timer);
    } else {
      this._fetchAndUpload(this.filterCollectorSet(usageCollection)); // initial fetch
    }

    this._timer = setInterval(() => {
      this._fetchAndUpload(this.filterCollectorSet(usageCollection));
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
   * @param {usageCollection} usageCollection
   * @return {Promise} - resolves to undefined
   */
  async _fetchAndUpload(usageCollection) {
    const collectorsReady = await usageCollection.areAllCollectorsReady();
    const hasUsageCollectors = usageCollection.some(usageCollection.isUsageCollector);
    if (!collectorsReady || typeof this.kibanaStatusGetter !== 'function') {
      this._log.debug('Skipping bulk uploading because not all collectors are ready');
      if (hasUsageCollectors) {
        this._lastFetchUsageTime = null;
        this._log.debug('Resetting lastFetchWithUsage because not all collectors are ready');
      }
      return;
    }

    const data = await usageCollection.bulkFetch(this._cluster.callAsInternalUser);
    const payload = this.toBulkUploadFormat(compact(data), usageCollection);
    if (payload && payload.length > 0) {
      try {
        this._log.debug(`Uploading bulk stats payload to the local cluster`);
        const result = await this._onPayload(payload);
        const sendSuccessful = !result.ignored && !result.errors;
        if (!sendSuccessful && hasUsageCollectors) {
          this._lastFetchUsageTime = null;
          this._holdSendingUsage = true;
          this._log.debug(
            'Resetting lastFetchWithUsage because uploading to the cluster was not successful.'
          );
        }

        if (sendSuccessful) {
          this._holdSendingUsage = false;
          if (hasUsageCollectors) {
            this._lastFetchUsageTime = Date.now();
          }
        }
        this._log.debug(`Uploaded bulk stats payload to the local cluster`);
      } catch (err) {
        this._log.warn(err.stack);
        this._log.warn(`Unable to bulk upload the stats payload to the local cluster`);
      }
    } else {
      this._log.debug(`Skipping bulk uploading of an empty stats payload`);
    }
  }

  async _onPayload(payload) {
    return await sendBulkPayload(
      this._cluster,
      this._interval,
      payload,
      this._log,
      this._hasDirectConnectionToMonitoringCluster,
      this._productionClusterUuid
    );
  }

  getKibanaStats(type) {
    const stats = {
      ...this.kibanaStats,
      status: this.kibanaStatusGetter(),
    };

    if (type === KIBANA_STATS_TYPE_MONITORING) {
      delete stats.port;
      delete stats.locale;
    }

    return stats;
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
  toBulkUploadFormat(rawData, usageCollection) {
    if (rawData.length === 0) {
      return [];
    }

    // convert the raw data to a nested object by taking each payload through
    // its formatter, organizing it per-type
    const typesNested = rawData.reduce((accum, { type, result }) => {
      const { type: uploadType, payload: uploadData } = usageCollection
        .getCollectorByType(type)
        .formatForBulkUpload(result);
      return defaultsDeep(accum, { [uploadType]: uploadData });
    }, {});
    // convert the nested object into a flat array, with each payload prefixed
    // with an 'index' instruction, for bulk upload
    const flat = Object.keys(typesNested).reduce((accum, type) => {
      return [
        ...accum,
        { index: { _type: type } },
        {
          kibana: this.getKibanaStats(type),
          ...typesNested[type],
        },
      ];
    }, []);

    return flat;
  }

  static checkPayloadTypesUnique(payload) {
    const ids = payload.map((item) => item[0].index._type);
    const uniques = uniq(ids);
    if (ids.length !== uniques.length) {
      throw new Error('Duplicate collector type identifiers found in payload! ' + ids.join(','));
    }
  }
}
