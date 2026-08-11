/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EBT_CLICK_ACTIONS, type EbtClickAttrs } from '@kbn/ebt-click';

/** `data-ebt-element` for all APM app menu controls. */
export const APM_APP_MENU_EBT_ELEMENT = 'apmAppMenu';

/**
 * EBT click actions for APM header / AppHeader menu items.
 * Prefer shared {@link EBT_CLICK_ACTIONS} when the intent is generic.
 */
export const APM_APP_MENU_EBT_ACTIONS = {
  CREATE_LATENCY_RULE: 'createLatencyRule',
  CREATE_FAILED_TRANSACTION_RATE_RULE: 'createFailedTransactionRateRule',
  CREATE_ANOMALY_RULE: 'createAnomalyRule',
  CREATE_ERROR_COUNT_RULE: 'createErrorCountRule',
  MANAGE_RULES: 'manageRules',
  CREATE_LATENCY_SLO: 'createLatencySlo',
  CREATE_AVAILABILITY_SLO: 'createAvailabilitySlo',
  MANAGE_SLOS: 'manageSlos',
  VIEW_ANOMALY_DETECTION: 'viewAnomalyDetection',
  VIEW_STORAGE_EXPLORER: 'viewStorageExplorer',
  VIEW_SETTINGS: 'viewSettings',
  OPEN_INSPECTOR: 'openInspector',
  ADD_DATA: EBT_CLICK_ACTIONS.ADD_DATA,
  OPEN_ACTIONS: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
} as const;

/** Builds AppMenu `ebt` props for a control in the APM app menu. */
export function apmAppMenuEbt(action: string, detail?: string): EbtClickAttrs {
  return {
    action,
    element: APM_APP_MENU_EBT_ELEMENT,
    ...(detail ? { detail } : {}),
  };
}
