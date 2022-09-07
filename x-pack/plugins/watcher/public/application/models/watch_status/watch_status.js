/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { getMoment } from '../../../../common/lib/get_moment';
import { ActionStatus } from '../action_status';

export class WatchStatus {
  constructor(props = {}) {
    this.id = get(props, 'id');
    this.state = get(props, 'state');
    this.comment = get(props, 'comment');
    this.isActive = get(props, 'isActive');
    this.lastExecution = getMoment(get(props, 'lastExecution'));
    this.lastChecked = getMoment(get(props, 'lastChecked'));
    this.lastMetCondition = getMoment(get(props, 'lastMetCondition'));

    const actionStatuses = get(props, 'actionStatuses', []);
    this.actionStatuses = actionStatuses.map((actionStatus) =>
      ActionStatus.fromUpstreamJson(actionStatus)
    );
  }

  static fromUpstreamJson(upstreamWatchStatus) {
    return new WatchStatus(upstreamWatchStatus);
  }
}
