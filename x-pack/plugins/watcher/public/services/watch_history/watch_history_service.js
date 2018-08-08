/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { ROUTES } from '../../../common/constants';
import { WatchHistoryItem } from 'plugins/watcher/models/watch_history_item';

export class WatchHistoryService {
  constructor($http) {
    this.$http = $http;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  /**
   * @param watchHistoryItemId string ID of watch history item
   * @return Promise watch history item
   */
  loadWatchHistoryItem(watchHistoryItemId) {
    return this.$http.get(`${this.basePath}/history/${watchHistoryItemId}`)
      .then(response => {
        return WatchHistoryItem.fromUpstreamJson(response.data.watchHistoryItem);
      });
  }
}
