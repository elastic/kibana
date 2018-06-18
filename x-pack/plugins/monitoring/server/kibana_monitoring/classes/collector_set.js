/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callClusterFactory } from '../../../../xpack_main';
import { flatten, isEmpty } from 'lodash';
import Promise from 'bluebird';
import { getCollectorLogger } from '../lib';
import { Collector } from './collector';
import { UsageCollector } from './usage_collector';

/*
 * A collector object has types registered into it with the register(type)
 * function. Each type that gets registered defines how to fetch its own data
 * and combine it into a unified payload for bulk upload.
 */
export class CollectorSet {

  /*
   * @param {Object} server - server object
   * @param {Number} options.interval - in milliseconds
   * @param {Function} options.combineTypes
   * @param {Function} options.onPayload
   */
  constructor(server, { interval, combineTypes, onPayload }) {
    this._collectors = [];
    this._timer = null;

    if (typeof interval !== 'number') {
      throw new Error('interval number of milliseconds is required');
    }
    if (typeof combineTypes !== 'function') {
      throw new Error('combineTypes function is required');
    }
    if (typeof onPayload !== 'function') {
      throw new Error('onPayload function is required');
    }

    this._log = getCollectorLogger(server);

    this._interval = interval;
    this._combineTypes = combineTypes;
    this._onPayload = onPayload;
    this._callClusterInternal = callClusterFactory(server).getCallClusterInternal();
  }

  /*
   * @param collector {Collector} collector object
   */
  register(collector) {
    // check instanceof
    if (!(collector instanceof Collector)) {
      throw new Error('CollectorSet can only have Collector instances registered');
    }
    this._collectors.push(collector);
  }

  /*
   * Call all the init methods
   * if fetchAfterInit is true, fetch and collect immediately
   */
  start() {
    const initialCollectors = [];
    this._log.info(`Starting all stats collectors`);

    this._collectors.forEach(collector => {
      if (collector.init) {
        this._log.debug(`Initializing ${collector.type} collector`);
        collector.init();
      }

      this._log.debug(`Setting logger for ${collector.type} collector`);

      if (collector.fetchAfterInit) {
        initialCollectors.push(collector);
      }
    });

    // do some fetches and bulk collect
    if (initialCollectors.length > 0) {
      this._fetchAndUpload(this._callClusterInternal, initialCollectors);
    }

    this._timer = setInterval(() => {
      this._fetchAndUpload(this._callClusterInternal, this._collectors);
    }, this._interval);
  }

  async _fetchAndUpload(callCluster, collectors) {
    const data = await this._bulkFetch(callCluster, collectors);
    const usableData = data.filter(d => Boolean(d) && !isEmpty(d.result));
    const payload = usableData.map(({ result, type }) => {
      if (!isEmpty(result)) {
        return [
          { index: { _type: type } },
          result
        ];
      }
    });

    if (payload.length > 0) {
      try {
        const combinedData = this._combineTypes(payload); // use the collector types combiner
        this._log.debug(`Uploading bulk stats payload to the local cluster`);
        this._onPayload(flatten(combinedData));
      } catch(err) {
        this._log.warn(err);
        this._log.warn(`Unable to bulk upload the stats payload to the local cluster`);
      }
    } else {
      this._log.debug(`Skipping bulk uploading of an empty stats payload`);
    }
  }

  /*
   * Call a bunch of fetch methods and then do them in bulk
   */
  _bulkFetch(callCluster, collectors) {
    return Promise.map(collectors, collector => {
      const collectorType = collector.type;
      this._log.debug(`Fetching data from ${collectorType} collector`);
      return Promise.props({
        type: collectorType,
        result: collector.fetchInternal(callCluster) // use the wrapper for fetch, kicks in error checking
      })
        .catch(err => {
          this._log.warn(err);
          this._log.warn(`Unable to fetch data from ${collectorType} collector`);
        });
    });
  }

  async bulkFetchUsage(callCluster) {
    const usageCollectors = this._collectors.filter(c => c instanceof UsageCollector);
    const bulk = await this._bulkFetch(callCluster, usageCollectors);

    // summarize each type of stat
    return bulk.reduce((accumulatedStats, currentStat) => {
      /* Suffix removal is a temporary hack: some types have `_stats` suffix
       * because of how monitoring bulk upload needed to combine types. It can
       * be removed when bulk upload goes away
       */
      const statType = currentStat.type.replace('_stats', '');
      return {
        ...accumulatedStats,
        [statType]: currentStat.result,
      };
    }, {});
  }

  cleanup() {
    this._log.info(`Stopping all stats collectors`);

    // stop fetching
    clearInterval(this._timer);

    this._collectors.forEach(collector => {
      if (collector.cleanup) {
        this._log.debug(`Running ${collector.type} cleanup`);
        collector.cleanup();
      }
    });
  }
}
