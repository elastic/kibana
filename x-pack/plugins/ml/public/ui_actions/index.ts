/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import {
  createEditSwimlanePanelAction,
  EDIT_SWIMLANE_PANEL_ACTION,
} from './edit_swimlane_panel_action';
import {
  createOpenInExplorerAction,
  OPEN_IN_ANOMALY_EXPLORER_ACTION,
} from './open_in_anomaly_explorer_action';
import { EditSwimlanePanelContext } from '../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';
import { UiActionsSetup } from '../../../../../src/plugins/ui_actions/public';
import { MlPluginStart, MlStartDependencies } from '../plugin';
import { CONTEXT_MENU_TRIGGER } from '../../../../../src/plugins/embeddable/public';
import {
  APPLY_TO_CURRENT_VIEW_ACTION,
  createApplyToCurrentViewAction,
} from './apply_current_view_action';
import { SWIM_LANE_SELECTION_TRIGGER, swimLaneSelectionTrigger } from './triggers';
import { SwimLaneDrilldownContext } from '../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';

/**
 * Register ML UI actions
 */
export function registerMlUiActions(
  uiActions: UiActionsSetup,
  core: CoreSetup<MlStartDependencies, MlPluginStart>
) {
  // Initialize actions
  const editSwimlanePanelAction = createEditSwimlanePanelAction(core.getStartServices);
  const openInExplorerAction = createOpenInExplorerAction(core.getStartServices);
  const applyToCurrentViewAction = createApplyToCurrentViewAction(core.getStartServices);

  // Register actions
  uiActions.registerAction(editSwimlanePanelAction);
  uiActions.registerAction(openInExplorerAction);
  uiActions.registerAction(applyToCurrentViewAction);

  // Assign triggers
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, editSwimlanePanelAction.id);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, openInExplorerAction.id);

  uiActions.registerTrigger(swimLaneSelectionTrigger);

  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, applyToCurrentViewAction);
  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, openInExplorerAction);
}

declare module '../../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [EDIT_SWIMLANE_PANEL_ACTION]: EditSwimlanePanelContext;
    [OPEN_IN_ANOMALY_EXPLORER_ACTION]: SwimLaneDrilldownContext;
    [APPLY_TO_CURRENT_VIEW_ACTION]: SwimLaneDrilldownContext;
  }

  export interface TriggerContextMapping {
    [SWIM_LANE_SELECTION_TRIGGER]: SwimLaneDrilldownContext;
  }
}
