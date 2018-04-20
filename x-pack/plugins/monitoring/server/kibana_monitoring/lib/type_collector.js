/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, isEmpty } from 'lodash';
import { LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG } from '../../../common/constants';
import Promise from 'bluebird';

const LOGGING_TAGS = [LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG];

export class TypeCollector {

  /*
   * @param options.interval {Number} in milliseconds
   * @param options.logger {Function}
   * @param options.combineTypes {Function}
   * @param options.onPayload {Function}
   */
  constructor({ interval, logger, combineTypes, onPayload }) {
    this._collectors = [];
    this._timer = null;

    if (typeof interval !== 'number') {
      throw new Error('interval number of milliseconds is required');
    }
    if (typeof logger !== 'function') {
      throw new Error('Logger function is required');
    }
    if (typeof combineTypes !== 'function') {
      throw new Error('combineTypes function is required');
    }
    if (typeof onPayload !== 'function') {
      throw new Error('onPayload function is required');
    }

    this._log = {
      debug: message => logger(['debug', ...LOGGING_TAGS], message),
      info: message => logger(['info', ...LOGGING_TAGS], message),
      warn: message => logger(['warning', ...LOGGING_TAGS], message)
    };

    this._interval = interval;
    this._combineTypes = combineTypes;
    this._onPayload = onPayload;
  }

  /*
   * @param {Object} collectorOptions (required)
   * Fields:
   * - type {String}
   * - init {Function} (optional)
   * - fetch {Function}
   * - cleanup {Function} (optional)
   */
  register(collectorOptions) {
    this._collectors.push(collectorOptions);
  }

  /*
   * Call all the init methods
   * if fetchAfterInit is true, fetch and collect immediately
   */
  start() {
    const initialCollectors = [];
    this._log.info(`Starting all Kibana monitoring collectors`);

    this._collectors.forEach(collector => {
      if (collector.init) {
        this._log.debug(`Initializing ${collector.type} collector`);
        collector.init();
      }

      if (collector.setLogger) {
        this._log.debug(`Setting logger for ${collector.type} collector`);
        collector.setLogger(this._log);
      }

      if (collector.fetchAfterInit) {
        initialCollectors.push(collector);
      }
    });

    // do some fetches and bulk collect
    if (initialCollectors.length > 0) {
      this._fetchAndUpload(initialCollectors);
    }

    this._timer = setInterval(() => {
      this._fetchAndUpload(this._collectors);
    }, this._interval);
  }

  async _fetchAndUpload(collectors) {
    const data = await this._bulkFetch(collectors);
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
        const combinedData = this._combineTypes(payload);
        this._log.debug(`Uploading bulk Kibana monitoring payload`);
        this._onPayload(flatten(combinedData));
      } catch(err) {
        this._log.warn(err);
        this._log.warn(`Unable to bulk upload the Kibana monitoring payload`);
      }
    } else {
      this._log.debug(`Skipping bulk uploading of empty Kibana monitoring payload`);
    }
  }

  /*
   * Call a bunch of fetch methods and then do them in bulk
   */
  _bulkFetch(collectors) {
    return Promise.map(collectors, collector => {
      const collectorType = collector.type;
      this._log.debug(`Fetching data from ${collectorType} collector`);
      return Promise.props({
        type: collectorType,
        result: collector.fetch()
      })
        .catch(err => {
          this._log.warn(err);
          this._log.warn(`Unable to fetch data from ${collectorType} collector`);
        });
    });
  }

  cleanup() {
    this._log.info(`Stopping all Kibana monitoring collectors`);

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
