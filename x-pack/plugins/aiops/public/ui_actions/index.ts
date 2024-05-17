/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import {
  CATEGORIZE_FIELD_TRIGGER,
  categorizeFieldTrigger,
} from '@kbn/ml-ui-actions/src/aiops/ui_actions';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';

import type { CoreStart } from '@kbn/core/public';
import { createCategorizeFieldAction } from '../components/log_categorization';
import type { AiopsPluginStartDeps } from '../types';
import { createAddChangePointChartAction } from './create_change_point_chart';
import { createOpenChangePointInMlAppAction } from './open_change_point_ml';

export function registerAiopsUiActions(
  uiActions: UiActionsSetup,
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
) {
  const openChangePointInMlAppAction = createOpenChangePointInMlAppAction(coreStart, pluginStart);
  const addChangePointChartAction = createAddChangePointChartAction(coreStart, pluginStart);

  uiActions.addTriggerAction('ADD_PANEL_TRIGGER', addChangePointChartAction);

  uiActions.registerTrigger(categorizeFieldTrigger);

  uiActions.addTriggerAction(
    CATEGORIZE_FIELD_TRIGGER,
    createCategorizeFieldAction(coreStart, pluginStart)
  );

  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, openChangePointInMlAppAction);
}
