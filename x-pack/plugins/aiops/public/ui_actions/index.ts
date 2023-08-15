/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { createEditChangePointChartsPanelAction } from './edit_change_point_charts_panel';
import type { AiopsCoreSetup } from '../plugin';

export function registerAiopsUiActions(uiActions: UiActionsSetup, core: AiopsCoreSetup) {
  // Initialize actions
  const editChangePointChartPanelAction = createEditChangePointChartsPanelAction(
    core.getStartServices
  );
  // Register actions
  uiActions.registerAction(editChangePointChartPanelAction);
  // Assign and register triggers
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, editChangePointChartPanelAction.id);
}
