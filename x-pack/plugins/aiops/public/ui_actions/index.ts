/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { categorizeFieldTrigger, CATEGORIZE_FIELD_TRIGGER } from '@kbn/ml-ui-actions';
import type { CoreStart } from '@kbn/core/public';
import type { AiopsPluginStartDeps } from '../types';

export function registerAiopsUiActions(
  uiActions: UiActionsSetup,
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
) {
  Promise.all([
    import('./edit_change_point_charts_panel'),
    import('../components/log_categorization'),
  ]).then(([{ createEditChangePointChartsPanelAction }, { createCategorizeFieldAction }]) => {
    //

    // Initialize actions
    const editChangePointChartPanelAction = createEditChangePointChartsPanelAction(
      coreStart,
      pluginStart
    );
    // // Register actions and triggers
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, editChangePointChartPanelAction);

    uiActions.registerTrigger(categorizeFieldTrigger);

    uiActions.addTriggerAction(
      CATEGORIZE_FIELD_TRIGGER,
      createCategorizeFieldAction(coreStart, pluginStart)
    );
  });
}
