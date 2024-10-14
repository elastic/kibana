/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-browser/src';
import { CoreSetup } from '@kbn/core-lifecycle-browser';
import { createStatusOverviewPanelAction } from './create_stats_overview_panel_action';
import { createMonitorsOverviewPanelAction } from './create_monitors_overview_panel_action';
import { ClientPluginsSetup, ClientPluginsStart } from '../../../plugin';

export const registerSyntheticsUiActions = async (
  core: CoreSetup<ClientPluginsStart, unknown>,
  pluginsSetup: ClientPluginsSetup
) => {
  const { uiActions, cloud, serverless } = pluginsSetup;

  // Initialize actions
  const addStatsOverviewPanelAction = createStatusOverviewPanelAction(core.getStartServices);
  const addMonitorsOverviewPanelAction = createMonitorsOverviewPanelAction(core.getStartServices);

  // Assign triggers
  // Only register these actions in stateful kibana, and the serverless observability project
  if (Boolean((serverless && cloud?.serverless.projectType === 'observability') || !serverless)) {
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addStatsOverviewPanelAction);
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addMonitorsOverviewPanelAction);
  }
};
