/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export class WatchErrors {
  constructor(props = {}) {
    this.actionErrors = get(props, 'actions');
  }

  static fromUpstreamJson(upstreamWatchStatus) {
    return new WatchErrors(upstreamWatchStatus);
  }
}
