/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { ROUTES } from '../../../common/constants';
import { Watch } from 'plugins/watcher/models/watch';

export class WatchesService {
  constructor($http) {
    this.$http = $http;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  getWatchList() {
    return this.$http.get(`${this.basePath}/watches`)
      .then(response => response.data.watches)
      .then(watches => watches.map(watch => {
        return Watch.fromUpstreamJson(watch);
      }));
  }

  /**
   * Delete a collection of watches
   *
   * @param watchIds Array of watch IDs
   * @return Promise { numSuccesses, numErrors }
   */
  deleteWatches(watchIds) {
    // $http.delete does not take the request body as the 2nd argument. Instead it expects the 2nd
    // argument to be a request options object, one of which can be the request body (data). We also
    // need to explicity define the content type of the data.
    const requestOpts = {
      data: { watchIds },
      headers: { 'Content-Type': 'application/json' }
    };
    return this.$http.delete(`${this.basePath}/watches`, requestOpts)
      .then(response => response.data.results);
  }
}
