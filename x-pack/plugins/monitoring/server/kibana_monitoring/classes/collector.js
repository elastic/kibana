/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCollectorLogger } from '../lib';

export class Collector {
  /*
   * @param {Object} server - server object
   * @param {String} properties.type - property name as the key for the data
   * @param {Function} properties.init (optional) - initialization function
   * @param {Function} properties.fetch - function to query data
   * @param {Function} properties.cleanup (optional) - cleanup function -- TODO remove this, handle it in the collector itself
   * @param {Boolean} properties.fetchAfterInit (optional) - if collector should fetch immediately after init -- TODO remove this, not useful
   */
  constructor(server, { type, init, fetch, cleanup, fetchAfterInit }) {
    this.type = type;
    this.init = init;
    this.fetch = fetch;
    this.cleanup = cleanup;
    this.fetchAfterInit = fetchAfterInit;

    this.log = getCollectorLogger(server);
  }

  fetchInternal(callCluster) {
    if (typeof callCluster !== 'function') {
      throw new Error('A `callCluster` function must be passed to the fetch methods of collectors');
    }
    return this.fetch(callCluster);
  }
}
