/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  constructor(server) {
    this._log = getCollectorLogger(server);
    this._collectors = [];
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

    if (collector.init) {
      this._log.debug(`Initializing ${collector.type} collector`);
      collector.init();
    }
  }

  /*
   * Call a bunch of fetch methods and then do them in bulk
   * @param {Array} collectors - an array of collectors, default to all registered collectors
   */
  bulkFetch(callCluster, collectors = this._collectors) {
    if (!Array.isArray(collectors)) {
      throw new Error(`bulkFetch method given bad collectors parameter: ` + typeof collectors);
    }

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
    const bulk = await this.bulkFetch(callCluster, usageCollectors);

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
}
