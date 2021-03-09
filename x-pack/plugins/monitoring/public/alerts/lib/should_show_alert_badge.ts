/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInSetupMode } from '../../lib/setup_mode';
import { CommonAlertStatus } from '../../../common/types/alerts';
import { ISetupModeContext } from '../../components/setup_mode/setup_mode_context';

export function shouldShowAlertBadge(
  alerts: { [alertTypeId: string]: CommonAlertStatus },
  alertTypeIds: string[],
  context?: ISetupModeContext
) {
  if (!alerts) {
    return false;
  }

  if (isInSetupMode(context)) {
    return true;
  }

  for (const key in alerts) {
    if (!alerts.hasOwnProperty(key)) {
      continue;
    }
    const alert = alerts[key];
    if (alertTypeIds.indexOf(alert.rawAlert?.alertTypeId) >= 0) {
      return true;
    }
  }

  return false;
}
