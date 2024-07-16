/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import type { CoreSetup } from '@kbn/core/public';
import { createOverviewPanelAction } from './create_overview_panel_action';
import { createAddErrorBudgetPanelAction } from './create_error_budget_action';
import { createAddAlertsPanelAction } from './create_alerts_panel_action';
import { SloPublicPluginsStart, SloPublicStart, SloPublicPluginsSetup } from '..';

export function registerSloUiActions(
  core: CoreSetup<SloPublicPluginsStart, SloPublicStart>,
  pluginsSetup: SloPublicPluginsSetup,
  pluginsStart: SloPublicPluginsStart
) {
  const { uiActions } = pluginsSetup;
  const { serverless, cloud } = pluginsStart;

  // Initialize actions
  const addOverviewPanelAction = createOverviewPanelAction(core.getStartServices);
  const addErrorBudgetPanelAction = createAddErrorBudgetPanelAction(core.getStartServices);
  const addAlertsPanelAction = createAddAlertsPanelAction(core.getStartServices);

  // Assign triggers
  // Only register these actions in stateful kibana, and the serverless observability project
  if (Boolean((serverless && cloud?.serverless.projectType === 'observability') || !serverless)) {
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addOverviewPanelAction);
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addErrorBudgetPanelAction);
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addAlertsPanelAction);
  }
}
