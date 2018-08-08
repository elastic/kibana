/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { badRequest } from 'boom';
import { WATCH_TYPES } from '../../../common/constants';
import { JsonWatch } from './json_watch';
import { MonitoringWatch } from './monitoring_watch';
import { ThresholdWatch } from './threshold_watch';
import { getWatchType } from './lib/get_watch_type';

const WatchTypes = {};
set(WatchTypes, WATCH_TYPES.JSON, JsonWatch);
set(WatchTypes, WATCH_TYPES.MONITORING, MonitoringWatch);
set(WatchTypes, WATCH_TYPES.THRESHOLD, ThresholdWatch);

export class Watch {
  static getWatchTypes = () => {
    return WatchTypes;
  }

  // from Kibana
  static fromDownstreamJson(json) {
    if (!json.type) {
      throw badRequest('json argument must contain an type property');
    }

    const WatchType = WatchTypes[json.type];
    if (!WatchType) {
      throw badRequest(`Attempted to load unknown type ${json.type}`);
    }

    return WatchType.fromDownstreamJson(json);
  }

  // from Elasticsearch
  static fromUpstreamJson(json) {
    if (!json.watchJson) {
      throw badRequest('json argument must contain a watchJson property');
    }

    const type = getWatchType(json.watchJson);
    const WatchType = WatchTypes[type];

    return WatchType.fromUpstreamJson(json);
  }
}
