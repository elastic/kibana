/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isInSetupMode } from '../../lib/setup_mode';
import { CommonAlertStatus } from '../../../common/types';

export function shouldShowAlertBadge(
  alerts: { [alertTypeId: string]: CommonAlertStatus },
  alertTypeIds: string[]
) {
  if (!alerts) {
    return false;
  }
  const inSetupMode = isInSetupMode();
  return inSetupMode || alertTypeIds.find((name) => alerts[name] && alerts[name].states.length);
}
