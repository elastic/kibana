/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Collector {
  /*
   * @param {String} type - property name as the key for the data
   * @param {Function} init (optional) - initialization function
   * @param {Function} fetch - function to query data
   * @param {Function} cleanup (optional) - cleanup function
   * @param {Boolean} fetchAfterInit (optional) - if collector should fetch immediately after init
   */
  constructor({ type, init, fetch, cleanup, fetchAfterInit }) {
    this.type = type;
    this.init = init;
    this.fetch = fetch;
    this.cleanup = cleanup;

    this.fetchAfterInit = fetchAfterInit;
  }

  /*
   * Allows using `server.log('debug', message)` as `this.log.debug(message)`.
   * Works for info and warn logs as well.
   */
  setLogger(logger) {
    this.log = logger;
  }
}
