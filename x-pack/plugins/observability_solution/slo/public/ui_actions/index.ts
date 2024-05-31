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
import { createEditSloOverviewPanelAction } from './edit_slo_overview_panel';
import { createOverviewPanelAction } from './create_overview_panel_action';
import { createAddErrorBudgetPanelAction } from './create_error_budget_action';
import { createAddAlertsPanelAction } from './create_alerts_panel_action';
import { SloPublicPluginsStart, SloPublicStart } from '..';

export function registerSloUiActions(
  uiActions: UiActionsSetup,
  core: CoreSetup<SloPublicPluginsStart, SloPublicStart>
) {
  // Initialize actions
  const editSloAlertsPanelAction = createEditSloAlertsPanelAction(core.getStartServices);
  const editSloOverviewPanelAction = createEditSloOverviewPanelAction(core.getStartServices);
  const addOverviewPanelAction = createOverviewPanelAction(core.getStartServices);
  const addErrorBudgetPanelAction = createAddErrorBudgetPanelAction(core.getStartServices);
  const addAlertsPanelAction = createAddAlertsPanelAction(core.getStartServices);

  // Assign triggers
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, editSloAlertsPanelAction);
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, editSloOverviewPanelAction);
  uiActions.addTriggerAction('ADD_PANEL_TRIGGER', addOverviewPanelAction);
  uiActions.addTriggerAction('ADD_PANEL_TRIGGER', addErrorBudgetPanelAction);
  uiActions.addTriggerAction('ADD_PANEL_TRIGGER', addAlertsPanelAction);
}
