/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { DataVisualizerStartDependencies } from '../../common/types/data_visualizer_plugin';

export function registerDataVisualizerUiActions(
  uiActions: UiActionsSetup,
  coreStart: CoreStart,
  pluginStart: DataVisualizerStartDependencies
) {
  import('./create_field_stats_table').then(({ createAddFieldStatsTableAction }) => {
    const addFieldStatsAction = createAddFieldStatsTableAction(coreStart, pluginStart);
    uiActions.addTriggerAction('ADD_PANEL_TRIGGER', addFieldStatsAction);
  });
}
