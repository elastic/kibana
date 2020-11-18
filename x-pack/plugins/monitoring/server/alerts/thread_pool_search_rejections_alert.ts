/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThreadPoolRejectionsAlertBase } from './thread_pool_rejections_alert_base';
import { ALERT_THREAD_POOL_SEARCH_REJECTIONS, ALERT_DETAILS } from '../../common/constants';
import { Alert } from '../../../alerts/common';

export class ThreadPoolSearchRejectionsAlert extends ThreadPoolRejectionsAlertBase {
  private static TYPE = ALERT_THREAD_POOL_SEARCH_REJECTIONS;
  private static THREAD_POOL_TYPE = 'search';
  private static readonly LABEL = ALERT_DETAILS[ALERT_THREAD_POOL_SEARCH_REJECTIONS].label;
  constructor(rawAlert?: Alert) {
    super(
      rawAlert,
      ThreadPoolSearchRejectionsAlert.TYPE,
      ThreadPoolSearchRejectionsAlert.THREAD_POOL_TYPE,
      ThreadPoolSearchRejectionsAlert.LABEL,
      ThreadPoolRejectionsAlertBase.createActionVariables(
        ThreadPoolSearchRejectionsAlert.THREAD_POOL_TYPE
      )
    );
  }
}
