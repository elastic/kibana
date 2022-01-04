/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInSetupMode } from '../../lib/setup_mode';
import { ISetupModeContext } from '../../components/setup_mode/setup_mode_context';
import { AlertsByName } from '../types';

export function shouldShowAlertBadge(
  alerts: AlertsByName,
  alertTypeIds: string[],
  context?: ISetupModeContext
) {
  if (!alerts) {
    return false;
  }
  const inSetupMode = isInSetupMode(context);
  const alertExists = alertTypeIds.find(
    (name) => alerts[name] && alerts[name].find((rule) => rule.states.length > 0)
  );
  return inSetupMode || alertExists;
}
