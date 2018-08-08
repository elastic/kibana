/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { getMoment } from '../../../common/lib/get_moment';
import { get, cloneDeep } from 'lodash';
import { WatchStatus } from '../watch_status';

export class WatchHistoryItem {
  constructor(props) {
    this.id = props.id;
    this.watchId = props.watchId;
    this.watchHistoryItemJson = props.watchHistoryItemJson;
    this.includeDetails = Boolean(props.includeDetails);

    this.details = cloneDeep(this.watchHistoryItemJson);
    this.startTime = getMoment(get(this.watchHistoryItemJson, 'result.execution_time'));

    const watchStatusJson = get(this.watchHistoryItemJson, 'status');
    const state = get(this.watchHistoryItemJson, 'state');
    this.watchStatus = WatchStatus.fromUpstreamJson({ id: this.watchId, watchStatusJson, state });
  }

  get downstreamJson() {
    return {
      id: this.id,
      watchId: this.watchId,
      details: this.includeDetails ? this.details : null,
      startTime: this.startTime.toISOString(),
      watchStatus: this.watchStatus.downstreamJson
    };
  }

  // generate object from elasticsearch response
  static fromUpstreamJson(json, opts) {
    if (!json.id) {
      throw badRequest('json argument must contain a id property');
    }
    if (!json.watchId) {
      throw badRequest('json argument must contain a watchId property');
    }
    if (!json.watchHistoryItemJson) {
      throw badRequest('json argument must contain a watchHistoryItemJson property');
    }

    const props = { ...json, ...opts };
    return new WatchHistoryItem(props);
  }
}
