/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core-lifecycle-browser';

import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-browser/src';
import { createMonitorsOverviewPanelAction } from './ui_actions/create_monitors_overview_panel_action';
import { createStatusOverviewPanelAction } from './ui_actions/create_overview_panel_action';
import { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';
import { SYNTHETICS_MONITORS_EMBEDDABLE, SYNTHETICS_OVERVIEW_EMBEDDABLE } from './constants';

export const registerSyntheticsEmbeddables = (
  core: CoreSetup<ClientPluginsStart, unknown>,
  pluginsSetup: ClientPluginsSetup
) => {
  pluginsSetup.embeddable.registerReactEmbeddableFactory(
    SYNTHETICS_OVERVIEW_EMBEDDABLE,
    async () => {
      const { getStatusOverviewEmbeddableFactory } = await import(
        './status_overview/status_overview_embeddable_factory'
      );
      return getStatusOverviewEmbeddableFactory(core.getStartServices);
    }
  );

  pluginsSetup.embeddable.registerReactEmbeddableFactory(
    SYNTHETICS_MONITORS_EMBEDDABLE,
    async () => {
      const { getMonitorsEmbeddableFactory } = await import(
        './monitors_overview/monitors_embeddable_factory'
      );
      return getMonitorsEmbeddableFactory(core.getStartServices);
    }
  );

  const { uiActions, cloud, serverless } = pluginsSetup;

  // Initialize actions
  const addStatsOverviewPanelAction = createStatusOverviewPanelAction();
  const addMonitorsOverviewPanelAction = createMonitorsOverviewPanelAction();

  core.getStartServices().then(([_, pluginsStart]) => {
    pluginsStart.dashboard.registerDashboardPanelPlacementSetting(
      SYNTHETICS_OVERVIEW_EMBEDDABLE,
      () => {
        return { width: 10, height: 8 };
      }
    );
    pluginsStart.dashboard.registerDashboardPanelPlacementSetting(
      SYNTHETICS_MONITORS_EMBEDDABLE,
      () => {
        return { width: 24, height: 12 };
      }
    );
  });

  // Assign triggers
  // Only register these actions in stateful kibana, and the serverless observability project
  if (Boolean((serverless && cloud?.serverless.projectType === 'observability') || !serverless)) {
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addStatsOverviewPanelAction);
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addMonitorsOverviewPanelAction);
  }
};
