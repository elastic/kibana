/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
import { badRequest } from 'boom';
import { BaseWatch } from './base_watch';
import { WATCH_TYPES } from '../../../common/constants';

export class MonitoringWatch extends BaseWatch {
  // This constructor should not be used directly.
  // JsonWatch objects should be instantiated using the
  // fromUpstreamJson and fromDownstreamJson static methods
  constructor(props) {
    super(props);

    this.isSystemWatch = true;
  }

  get watchJson() {
    const result = merge(
      {},
      super.watchJson
    );

    return result;
  }

  getVisualizeQuery() {
    throw badRequest('getVisualizeQuery called for monitoring watch');
  }

  formatVisualizeData() {
    throw badRequest('formatVisualizeData called for monitoring watch');
  }

  // To Elasticsearch
  get upstreamJson() {
    throw badRequest('upstreamJson called for monitoring watch');
  }

  // To Kibana
  get downstreamJson() {
    const result = merge(
      {},
      super.downstreamJson
    );

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = merge(
      {},
      super.getPropsFromUpstreamJson(json),
      {
        type: WATCH_TYPES.MONITORING
      }
    );

    return new MonitoringWatch(props);
  }

  // From Kibana
  static fromDownstreamJson() {
    throw badRequest('fromDownstreamJson called for monitoring watch');
  }

}
