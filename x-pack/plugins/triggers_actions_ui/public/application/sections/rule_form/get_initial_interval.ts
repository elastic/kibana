/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_RULE_INTERVAL } from '../../constants';
import { parseDuration } from '../../../../../alerting/common';

export function getInitialInterval(minimumScheduleInterval?: string) {
  if (minimumScheduleInterval) {
    // return minimum schedule interval if it is larger than the default
    if (parseDuration(minimumScheduleInterval) > parseDuration(DEFAULT_RULE_INTERVAL)) {
      return minimumScheduleInterval;
    }
  }
  return DEFAULT_RULE_INTERVAL;
}
