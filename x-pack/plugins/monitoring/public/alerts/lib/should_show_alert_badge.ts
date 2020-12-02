/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  const inSetupMode = isInSetupMode(context);
  return inSetupMode || alertTypeIds.find((name) => alerts[name] && alerts[name].states.length);
}
