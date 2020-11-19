/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

export interface SavedObjectsTaggingClientConfigRawType {
  // is a string because the server-side counterpart is a duration
  // which is serialized to string when sent to the client
  cache_refresh_interval: string;
}

export class SavedObjectsTaggingClientConfig {
  public cacheRefreshInterval: moment.Duration;

  constructor(rawConfig: SavedObjectsTaggingClientConfigRawType) {
    this.cacheRefreshInterval = moment.duration(rawConfig.cache_refresh_interval);
  }
}
