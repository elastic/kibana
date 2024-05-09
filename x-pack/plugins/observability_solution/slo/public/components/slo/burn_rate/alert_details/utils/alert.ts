/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_ACTION_ID,
  HIGH_PRIORITY_ACTION_ID,
  LOW_PRIORITY_ACTION_ID,
  MEDIUM_PRIORITY_ACTION_ID,
} from '../../../../../../common/constants';

export function getActionGroupFromReason(reason: string): string {
  const prefix = reason.split(':')[0]?.toLowerCase() ?? undefined;
  switch (prefix) {
    case 'critical':
      return ALERT_ACTION_ID;
    case 'high':
      return HIGH_PRIORITY_ACTION_ID;
    case 'medium':
      return MEDIUM_PRIORITY_ACTION_ID;
    case 'low':
    default:
      return LOW_PRIORITY_ACTION_ID;
  }
}
