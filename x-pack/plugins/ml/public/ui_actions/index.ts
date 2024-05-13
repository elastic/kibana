/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER } from '@kbn/ml-ui-actions';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
import { createApplyEntityFieldFiltersAction } from './apply_entity_filters_action';
import { createApplyInfluencerFiltersAction } from './apply_influencer_filters_action';
import { createApplyTimeRangeSelectionAction } from './apply_time_range_action';
import { createClearSelectionAction } from './clear_selection_action';
import { createAddSwimlanePanelAction } from './create_swim_lane';
import { createEditAnomalyChartsPanelAction } from './edit_anomaly_charts_panel_action';
import { createEditSingleMetricViewerPanelAction } from './edit_single_metric_viewer_panel_action';
import { createAddSingleMetricViewerPanelAction } from './create_single_metric_viewer';
import {
  createCategorizationADJobAction,
  createCategorizationADJobTrigger,
} from './open_create_categorization_job_action';
import { createOpenInExplorerAction } from './open_in_anomaly_explorer_action';
import { createOpenInSingleMetricViewerAction } from './open_in_single_metric_viewer_action';
import { createVisToADJobAction } from './open_vis_in_ml_action';
import {
  entityFieldSelectionTrigger,
  EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER,
  SWIM_LANE_SELECTION_TRIGGER,
  swimLaneSelectionTrigger,
} from './triggers';
export { APPLY_INFLUENCER_FILTERS_ACTION } from './apply_influencer_filters_action';
export { APPLY_TIME_RANGE_SELECTION_ACTION } from './apply_time_range_action';
export { OPEN_IN_ANOMALY_EXPLORER_ACTION } from './open_in_anomaly_explorer_action';
export { CREATE_LENS_VIS_TO_ML_AD_JOB_ACTION } from './open_vis_in_ml_action';
export { SWIM_LANE_SELECTION_TRIGGER };
/**
 * Register ML UI actions
 */
export function registerMlUiActions(
  uiActions: UiActionsSetup,
  core: CoreSetup<MlStartDependencies, MlPluginStart>
) {
  // Initialize actions
  const addSingleMetricViewerPanelAction = createAddSingleMetricViewerPanelAction(
    core.getStartServices
  );
  const addSwimlanePanelAction = createAddSwimlanePanelAction(core.getStartServices);
  const editSingleMetricViewerPanelAction = createEditSingleMetricViewerPanelAction(
    core.getStartServices
  );
  const openInExplorerAction = createOpenInExplorerAction(core.getStartServices);
  const openInSingleMetricViewerAction = createOpenInSingleMetricViewerAction(
    core.getStartServices
  );
  const applyInfluencerFiltersAction = createApplyInfluencerFiltersAction(core.getStartServices);
  const applyEntityFieldFilterAction = createApplyEntityFieldFiltersAction(core.getStartServices);
  const applyTimeRangeSelectionAction = createApplyTimeRangeSelectionAction(core.getStartServices);
  const clearSelectionAction = createClearSelectionAction(core.getStartServices);
  const editExplorerPanelAction = createEditAnomalyChartsPanelAction(core.getStartServices);
  const visToAdJobAction = createVisToADJobAction(core.getStartServices);
  const categorizationADJobAction = createCategorizationADJobAction(core.getStartServices);

  // Register actions
  uiActions.registerAction(applyEntityFieldFilterAction);
  uiActions.registerAction(applyTimeRangeSelectionAction);
  uiActions.registerAction(categorizationADJobAction);

  // Assign triggers
  uiActions.addTriggerAction('ADD_PANEL_TRIGGER', addSingleMetricViewerPanelAction);
  uiActions.addTriggerAction('ADD_PANEL_TRIGGER', addSwimlanePanelAction);
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, editSingleMetricViewerPanelAction);
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, editExplorerPanelAction);
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, openInExplorerAction);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, openInSingleMetricViewerAction.id);

  uiActions.registerTrigger(swimLaneSelectionTrigger);
  uiActions.registerTrigger(entityFieldSelectionTrigger);
  uiActions.registerTrigger(createCategorizationADJobTrigger);

  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, applyInfluencerFiltersAction);
  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, applyTimeRangeSelectionAction);
  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, openInExplorerAction);
  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, openInSingleMetricViewerAction);
  uiActions.addTriggerAction(SWIM_LANE_SELECTION_TRIGGER, clearSelectionAction);
  uiActions.addTriggerAction(EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER, applyEntityFieldFilterAction);
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, visToAdJobAction);
  uiActions.addTriggerAction(
    CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER,
    categorizationADJobAction
  );
}
