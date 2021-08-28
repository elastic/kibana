/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '../../../../../src/core/public/types';
import { CONTEXT_MENU_TRIGGER } from '../../../../../src/plugins/embeddable/public/lib/triggers/triggers';
import type { UiActionsSetup } from '../../../../../src/plugins/ui_actions/public/plugin';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
import { createApplyEntityFieldFiltersAction } from './apply_entity_filters_action';
import { createApplyInfluencerFiltersAction } from './apply_influencer_filters_action';
import { createApplyTimeRangeSelectionAction } from './apply_time_range_action';
import { createClearSelectionAction } from './clear_selection_action';
import { createEditAnomalyChartsPanelAction } from './edit_anomaly_charts_panel_action';
import { createEditSwimlanePanelAction } from './edit_swimlane_panel_action';
import { createOpenInExplorerAction } from './open_in_anomaly_explorer_action';
import {
  entityFieldSelectionTrigger,
  EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER,
  swimLaneSelectionTrigger,
  SWIM_LANE_SELECTION_TRIGGER,
} from './triggers';

export { APPLY_INFLUENCER_FILTERS_ACTION } from './apply_influencer_filters_action';
export { APPLY_TIME_RANGE_SELECTION_ACTION } from './apply_time_range_action';
export { EDIT_SWIMLANE_PANEL_ACTION } from './edit_swimlane_panel_action';
export { OPEN_IN_ANOMALY_EXPLORER_ACTION } from './open_in_anomaly_explorer_action';
export { SWIM_LANE_SELECTION_TRIGGER };
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
  const applyInfluencerFiltersAction = createApplyInfluencerFiltersAction(core.getStartServices);
  const applyEntityFieldFilterAction = createApplyEntityFieldFiltersAction(core.getStartServices);
  const applyTimeRangeSelectionAction = createApplyTimeRangeSelectionAction(core.getStartServices);
  const clearSelectionAction = createClearSelectionAction(core.getStartServices);
  const editExplorerPanelAction = createEditAnomalyChartsPanelAction(core.getStartServices);

  // Register actions
  uiActions.registerAction(editSwimlanePanelAction);
  uiActions.registerAction(openInExplorerAction);
  uiActions.registerAction(applyInfluencerFiltersAction);
  uiActions.registerAction(applyEntityFieldFilterAction);
  uiActions.registerAction(applyTimeRangeSelectionAction);
  uiActions.registerAction(clearSelectionAction);
  uiActions.registerAction(editExplorerPanelAction);

  // Assign triggers
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, editSwimlanePanelAction.id);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, editExplorerPanelAction.id);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, openInExplorerAction.id);

  uiActions.registerTrigger(swimLaneSelectionTrigger);
  uiActions.registerTrigger(entityFieldSelectionTrigger);

  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, applyInfluencerFiltersAction);
  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, applyTimeRangeSelectionAction);
  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, openInExplorerAction);
  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, clearSelectionAction);
  uiActions.addTriggerAction(EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER, applyEntityFieldFilterAction);
}
