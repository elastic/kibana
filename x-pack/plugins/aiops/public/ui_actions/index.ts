/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import {
  categorizeFieldTrigger,
  categorizeFieldValueTrigger,
  CATEGORIZE_FIELD_TRIGGER,
  CATEGORIZE_FIELD_VALUE_TRIGGER,
} from '@kbn/ml-ui-actions/src/aiops/ui_actions';

import type { CoreStart } from '@kbn/core/public';
import { createOpenChangePointInMlAppAction } from './open_change_point_ml';
import type { AiopsPluginStartDeps } from '../types';
import { createEditChangePointChartsPanelAction } from './edit_change_point_charts_panel';
import {
  createCategorizeFieldAction,
  categorizeFieldValueAction,
} from '../components/log_categorization';

export function registerAiopsUiActions(
  uiActions: UiActionsSetup,
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
) {
  // Initialize actions
  const editChangePointChartPanelAction = createEditChangePointChartsPanelAction(
    coreStart,
    pluginStart
  );
  const openChangePointInMlAppAction = createOpenChangePointInMlAppAction(coreStart, pluginStart);

  // // Register actions and triggers
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, editChangePointChartPanelAction);

  uiActions.registerTrigger(categorizeFieldTrigger);
  uiActions.addTriggerAction(
    CATEGORIZE_FIELD_TRIGGER,
    createCategorizeFieldAction(coreStart, pluginStart)
  );

  uiActions.registerTrigger(categorizeFieldValueTrigger);
  uiActions.addTriggerAction(
    CATEGORIZE_FIELD_VALUE_TRIGGER,
    categorizeFieldValueAction(coreStart, pluginStart)
  );
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, openChangePointInMlAppAction);
}
