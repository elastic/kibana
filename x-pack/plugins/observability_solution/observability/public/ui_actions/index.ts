/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { CoreSetup } from '@kbn/core/public';
import { createEditSloAlertsPanelAction } from './edit_slo_alerts_panel';
import { ObservabilityPublicPluginsStart, ObservabilityPublicStart } from '..';

export function registerSloAlertsUiActions(
  uiActions: UiActionsSetup,
  core: CoreSetup<ObservabilityPublicPluginsStart, ObservabilityPublicStart>
) {
  // Initialize actions
  const editSloAlertsPanelAction = createEditSloAlertsPanelAction(core.getStartServices);
  // Register actions
  uiActions.registerAction(editSloAlertsPanelAction);
  // Assign and register triggers
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, editSloAlertsPanelAction.id);
}
